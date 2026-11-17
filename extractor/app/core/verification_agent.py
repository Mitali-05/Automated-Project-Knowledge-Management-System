"""
Verification Agent (LLM 2):
Audits the architectural report and evidence synthesized by ReportAgent (LLM 1).
Validates code citations, detects repository ML models, and computes grounding metrics.
"""
import json
import logging
import time
from pydantic import ValidationError
from typing import List, Dict, Any, Optional
from app.core.models import AgentExtractionResult, VerificationReport, MLCodebaseAudit
from app.core.llm_client import get_verification_agent_client, LLMClient, LLMError, LLMOutputError
from app.core.comm_logger import (
    log_llm2_request, log_llm2_response
)

logger = logging.getLogger(__name__)

VERIFICATION_SYSTEM_PROMPT = """You are an elite Principal Software Auditor and Architecture Review Board Lead.
Your role is to strictly verify, audit, and ground the technical assertions made by the extraction agent (ReportAgent/LLM1).

You must inspect:
1. Evidence Soundness: Are the cited files, classes, endpoints, and architectural patterns real and grounded?
2. Subsystem Coverage Recall: Did LLM1 cover all primary functional directories in the codebase?
3. Hallucination Risk: Did LLM1 invent any non-existent libraries or claim speculative capabilities?
4. Codebase ML Audit: Check if the target repository contains Machine Learning/Data Science models (scikit-learn, PyTorch, TensorFlow, ONNX, training scripts, ROC-AUC evaluation logs). If ML models exist, extract their evaluation metrics. If it is a deterministic backend/API service, clearly state that classical ML classification metrics (ROC-AUC) do not apply.

Evidence limits are mandatory: a matching path proves file existence only, not
the behaviour of that file. This payload does not include complete source bodies
or executed tests. Do not certify production readiness or claim independently
verified behavioural accuracy. Use VERIFIED_WITH_WARNINGS when those checks are
unavailable, and state the limitation in audit_findings. Unsupported ROI, latency,
isolation, exact response codes and retry guarantees must be flagged. An embedding
model is an ML component, but it does not imply a classifier or measured ROC-AUC.
Never convert a count of existing file paths into a count of verified claims.

Return ONLY one valid JSON object matching the authoritative JSON Schema below.
Every property name must be double-quoted. No comments, _comment properties,
markdown, NaN, Infinity, or trailing commas. Put explanations in ml_audit.notes,
audit_findings or verification_agent_notes. Scores and counts are numbers, not
strings. Preserve uncertainty and negative findings. Never replace a rejected
audit with a passing verdict just to satisfy the schema.
""" + '\n' + json.dumps(VerificationReport.model_json_schema())

MAX_AUDIT_CORRECTIONS = 2

class VerificationAgent:
    def __init__(self, llm_client: Optional[LLMClient] = None):
        self.client = llm_client or get_verification_agent_client()

    def _validated_audit(self, user_content: str, project_id: str) -> VerificationReport:
        request = user_content
        protected_verdict = None
        for attempt in range(MAX_AUDIT_CORRECTIONS + 1):
            raw_response = None
            if project_id:
                log_llm2_request(project_id, VERIFICATION_SYSTEM_PROMPT, request,
                                 self.client.model, self.client.provider, temperature=0.0)
            try:
                raw_response = self.client.extract_json(
                    system_prompt=VERIFICATION_SYSTEM_PROMPT, user_content=request, temperature=0.0)
                if protected_verdict is not None and raw_response.get('verdict') != protected_verdict:
                    raise LLMError('Verification audit failed: formatting correction changed the previous audit verdict')
                report = VerificationReport.model_validate(raw_response, strict=True)
            except (LLMOutputError, ValidationError) as exc:
                if isinstance(exc, LLMOutputError):
                    invalid = exc.raw_response
                    diagnostic = str(exc)
                else:
                    invalid = json.dumps(raw_response)
                    diagnostic = json.dumps(exc.errors(include_input=False, include_url=False))
                    if raw_response.get('verdict') in ('VERIFIED_WITH_WARNINGS', 'REJECTED', 'AUDIT_FAILED'):
                        protected_verdict = raw_response['verdict']
                if project_id:
                    log_llm2_response(project_id, self.client.model, self.client.provider,
                                      invalid, parsed_successfully=False, error=diagnostic)
                if attempt == MAX_AUDIT_CORRECTIONS:
                    raise LLMError(f'Verification audit failed after {attempt} correction attempts: {diagnostic}') from exc
                logger.warning('Verification output invalid; requesting same-auditor correction %s/%s: %s',
                               attempt + 1, MAX_AUDIT_CORRECTIONS, diagnostic)
                request = (
                    user_content + '\n\nYour previous audit response was invalid:\n' + invalid
                    + '\n\nValidation errors: ' + diagnostic
                    + '\nReturn the COMPLETE valid audit JSON using the same evidence and schema. '
                    'Correct syntax and field types only. Preserve findings, limitations, metrics and verdict; '
                    'do not invent measurements, erase findings, substitute empty/default values or change '
                    'a rejected verdict into a pass. Move any comments into the supported notes/findings fields. '
                    'Do not re-explore the repository. No markdown or comments. '
                    'When a value cannot be supported, say so in the findings rather than claiming verification.'
                )
                time.sleep(15)
                continue
            # This is a substantive safety failure, not a formatting issue to retry away.
            if report.verdict == 'VERIFIED_PRODUCTION_GRADE':
                raise LLMError('Verification audit failed: a report-only audit cannot certify production readiness without source and runtime validation')
            if project_id:
                log_llm2_response(project_id, self.client.model, self.client.provider,
                                  raw_response, parsed_successfully=True)
            if attempt:
                logger.info('Verification audit validated after %s correction attempt(s)', attempt)
            return report

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
            "problem_statement": result.problem_statement,
            "tech_stack": result.tech_stack,
            "core_modules_count": result.analytics_metrics.core_module_count,
            "patterns_claimed": result.analytics_metrics.key_patterns_used,
            "knowledge_items_summary": [
                {
                    "title": k.title,
                    "module": k.module,
                    "evidence_ids": k.evidence_ids,
                    "confidence": k.confidence,
                    "summary": k.summary, "details": k.details
                }
                for k in result.knowledge_items[:15]
            ],
            "file_tree_sample": sorted(list(all_tree_paths))[:150],
            "empirical_evidence_count": total_evidence_cited,
            "empirical_verified_count": verified_evidence_count,
            "unverified_citations": unverified_evidence,
            "inspected_files": result.inspected_files,
            "architecture": result.architecture_mermaid_chart,
            "architecture_explanation": getattr(result, 'architecture_explanation', ''),
            "technical_diagrams": [d.model_dump() for d in getattr(result, 'technical_diagrams', [])],
            "sequence": result.developer_handover_guide.execution_sequence_chart,
            "business_value": result.presentation_deck.business_value,
            "roi_summary": result.presentation_deck.roi_summary,
            "workflows": [w.model_dump() for w in result.developer_handover_guide.critical_workflows],
            "validation_boundary": "File-path existence checked; no independent source-body audit or runtime tests supplied"
        }

        user_content = (
            f"Audit the following architectural knowledge extraction for repository: {owner}/{repo}\n\n"
            f"Audit Payload:\n{json.dumps(audit_payload, indent=2)}\n\n"
            f"Provide an objective verification report evaluating fact grounding, evidence precision, and ML applicability."
        )

        try:
            return self._validated_audit(user_content, project_id)

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

            if isinstance(e, LLMError):
                if str(e).startswith('Verification audit failed'):
                    raise
                raise LLMError('Verification audit failed: ' + str(e)) from e
            raise LLMError(f'Verification audit failed: {type(e).__name__}; see worker logs for details') from e
