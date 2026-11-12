"""
Verification Agent (LLM 2):
Audits the architectural report and evidence synthesized by ReportAgent (LLM 1).
Validates code citations, detects repository ML models, and computes grounding metrics.
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional
from app.core.models import AgentExtractionResult, VerificationReport, MLCodebaseAudit
from app.core.llm_client import get_verification_agent_client, LLMClient, LLMError
from app.core.comm_logger import (
    log_llm2_request, log_llm2_response, log_llm2_fallback
)

logger = logging.getLogger(__name__)

VERIFICATION_SYSTEM_PROMPT = """You are an elite Principal Software Auditor and Architecture Review Board Lead.
Your role is to strictly verify, audit, and ground the technical assertions made by the extraction agent (ReportAgent/LLM1).

You must inspect:
1. Evidence Soundness: Are the cited files, classes, endpoints, and architectural patterns real and grounded?
2. Subsystem Coverage Recall: Did LLM1 cover all primary functional directories in the codebase?
3. Hallucination Risk: Did LLM1 invent any non-existent libraries or claim speculative capabilities?
4. Codebase ML Audit: Check if the target repository contains Machine Learning/Data Science models (scikit-learn, PyTorch, TensorFlow, ONNX, training scripts, ROC-AUC evaluation logs). If ML models exist, extract their evaluation metrics. If it is a deterministic backend/API service, clearly state that classical ML classification metrics (ROC-AUC) do not apply.

Return ONLY a valid JSON object strictly matching this schema:
{
  "overall_trust_score": float (0-100),
  "verdict": "VERIFIED_PRODUCTION_GRADE" | "VERIFIED_WITH_WARNINGS" | "REJECTED" | "AUDIT_FAILED",
  "evidence_precision_score": float (0-100, proportion of cited code pointers verified),
  "subsystem_recall_coverage": float (0-100, proportion of top-level architectural subsystems audited),
  "hallucination_rate": float (0-100, % of ungrounded or speculative claims),
  "ml_audit": {
    "ml_models_detected": boolean,
    "detected_frameworks": [string],
    "roc_auc_score": float or null,
    "accuracy_score": float or null,
    "precision_score": float or null,
    "recall_score": float or null,
    "evaluation_dataset": string or null,
    "notes": string
  },
  "verified_claims_count": int,
  "unsupported_claims_count": int,
  "audit_findings": [string],
  "verification_agent_notes": string
}
"""

class VerificationAgent:
    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.client = llm_client or get_verification_agent_client()

    def audit_extraction(
        self, 
        result: AgentExtractionResult, 
        file_tree: List[Dict[str, Any]] = None,
        owner: str = "",
        repo: str = "",
        project_id: str = ""
    ) -> VerificationReport:
        all_tree_paths = {
            item.get("path", "").strip().lower() 
            for item in (file_tree or []) if item.get("path")
        }
        
        # 1. Empirical Codebase ML Detection
        ml_extensions = (".pkl", ".joblib", ".pt", ".pth", ".onnx", ".h5", ".tflite")
        ml_keywords = ("sklearn", "torch", "tensorflow", "keras", "xgboost", "lightgbm")
        
        has_ml_files = any(p.endswith(ml_extensions) for p in all_tree_paths)
        detected_frameworks = [
            tech for tech in result.tech_stack 
            if any(k in tech.lower() for k in ml_keywords)
        ]
        ml_detected = has_ml_files or len(detected_frameworks) > 0

        # 2. Strict Empirical Evidence Grounding Check
        total_evidence_cited = 0
        verified_evidence_count = 0
        unverified_evidence = []
        
        for item in result.knowledge_items:
            for ev in item.evidence_ids:
                total_evidence_cited += 1
                clean_ev = ev.strip().lower()
                
                # Strict check: exact path match or tail path match
                is_valid = clean_ev in all_tree_paths or any(
                    p.endswith("/" + clean_ev) or p == clean_ev for p in all_tree_paths
                )
                
                if is_valid:
                    verified_evidence_count += 1
                else:
                    unverified_evidence.append(ev)

        empirical_precision = (
            (verified_evidence_count / total_evidence_cited * 100) 
            if total_evidence_cited > 0 else 0.0
        )

        # 3. Payload for Verification LLM
        audit_payload = {
            "repository": f"{owner}/{repo}" if owner and repo else result.project_name,
            "project_name": result.project_name,
            "problem_statement": result.problem_statement[:500],
            "tech_stack": result.tech_stack,
            "core_modules_count": result.analytics_metrics.core_module_count,
            "patterns_claimed": result.analytics_metrics.key_patterns_used,
            "knowledge_items_summary": [
                {
                    "title": k.title,
                    "module": k.module,
                    "evidence_ids": k.evidence_ids,
                    "confidence": k.confidence
                }
                for k in result.knowledge_items[:15]
            ],
            "file_tree_sample": sorted(list(all_tree_paths))[:150],
            "empirical_evidence_count": total_evidence_cited,
            "empirical_verified_count": verified_evidence_count,
            "unverified_citations": unverified_evidence
        }

        user_content = (
            f"Audit the following architectural knowledge extraction for repository: {owner}/{repo}\n\n"
            f"Audit Payload:\n{json.dumps(audit_payload, indent=2)}\n\n"
            f"Provide an objective verification report evaluating fact grounding, evidence precision, and ML applicability."
        )

        if project_id:
            log_llm2_request(
                project_id=project_id,
                system_prompt=VERIFICATION_SYSTEM_PROMPT,
                user_content=user_content,
                model=self.client.model,
                provider=self.client.provider,
                temperature=0.0
            )

        try:
            raw_response = self.client.extract_json(
                system_prompt=VERIFICATION_SYSTEM_PROMPT,
                user_content=user_content,
                temperature=0.0
            )
            
            if project_id:
                log_llm2_response(
                    project_id=project_id,
                    model=self.client.model,
                    provider=self.client.provider,
                    raw_response=raw_response,
                    parsed_successfully=True
                )
            
            report = VerificationReport.model_validate(raw_response)
            
            # Reconcile empirical evidence checks
            if report.verified_claims_count == 0 and total_evidence_cited > 0:
                report.verified_claims_count = verified_evidence_count
                report.unsupported_claims_count = max(0, total_evidence_cited - verified_evidence_count)
                
            return report

        except Exception as e:
            logger.error(f"VerificationAgent LLM2 invocation failed: {e}. Refusing to emit unverified 100% scores.")
            
            if project_id:
                log_llm2_response(
                    project_id=project_id,
                    model=self.client.model,
                    provider=self.client.provider,
                    raw_response=None,
                    parsed_successfully=False,
                    error=str(e)
                )

            # Fail-closed report: do not inflate scores if the auditor crashed
            ml_audit = MLCodebaseAudit(
                ml_models_detected=ml_detected,
                detected_frameworks=detected_frameworks,
                roc_auc_score=None,
                accuracy_score=None,
                precision_score=None,
                recall_score=None,
                notes="Auditor LLM unavailable. Empirical inspection only: " + (
                    "ML indicators found." if ml_detected else "Deterministic application."
                )
            )

            fallback_report = VerificationReport(
                overall_trust_score=round(empirical_precision * 0.5, 1),
                verdict="AUDIT_FAILED",
                evidence_precision_score=round(empirical_precision, 1),
                subsystem_recall_coverage=0.0,
                hallucination_rate=round(100.0 - empirical_precision, 1),
                ml_audit=ml_audit,
                verified_claims_count=verified_evidence_count,
                unsupported_claims_count=max(0, total_evidence_cited - verified_evidence_count),
                audit_findings=[
                    f"CRITICAL: Auditor (LLM2) failed with error: {str(e)}.",
                    f"Empirical evidence grounding: {verified_evidence_count}/{total_evidence_cited} paths physically confirmed.",
                    "Overall verdict marked as AUDIT_FAILED until auditor service credentials are restored."
                ],
                verification_agent_notes=f"Audit execution incomplete due to LLM2 failure: {str(e)}"
            )

            if project_id:
                log_llm2_fallback(
                    project_id=project_id,
                    reason=str(e),
                    fallback_report=fallback_report.model_dump()
                )

            return fallback_report