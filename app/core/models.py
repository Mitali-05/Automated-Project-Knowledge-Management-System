from typing import Optional, List
from pydantic import BaseModel, Field


class KnowledgeItem(BaseModel):
    title: str
    knowledge_type: str  # TECHNICAL_DECISION | MODULE_RESPONSIBILITY | IMPLEMENTATION_DETAIL | CONFIGURATION | PROBLEM_RESOLUTION | DEPENDENCY
    summary: str
    details: str
    module: Optional[str] = None
    business_impact: str = "Low"  # Low | Medium | High | Critical
    confidence: float = Field(ge=0, le=1)
    evidence_ids: list[str] = []

class Evidence(BaseModel):
    id: str
    source_type: str
    source_id: str
    title: str
    url: str = ""
    excerpt: str = ""

class AnalyticsMetrics(BaseModel):
    estimated_complexity: str  # Low | Medium | High | Enterprise
    core_module_count: int
    key_patterns_used: list[str] = []
    data_flow_complexity: str
    security_posture: str

class PresentationDeck(BaseModel):
    executive_pitch: str
    business_value: str
    technical_challenges: str
    future_scope: str
    target_audience: Optional[str] = "Engineering Leaders, Architects & Stakeholders"
    roi_summary: Optional[str] = ""

class DirectoryItem(BaseModel):
    folder_path: str
    architectural_role: str

class CriticalWorkflow(BaseModel):
    workflow_name: str
    entry_point: str
    execution_path: str

class DeveloperHandoverGuide(BaseModel):
    local_setup_prerequisites: str
    directory_tour: list[DirectoryItem] = []
    critical_workflows: list[CriticalWorkflow] = []
    directory_dependency_chart: Optional[str] = ""
    execution_sequence_chart: Optional[str] = ""
    testing_instructions: Optional[str] = ""
    cicd_instructions: Optional[str] = ""
    technical_debt_and_fragility: list[str] = []

class MLCodebaseAudit(BaseModel):
    ml_models_detected: bool = False
    detected_frameworks: list[str] = []
    roc_auc_score: Optional[float] = None
    accuracy_score: Optional[float] = None
    precision_score: Optional[float] = None
    recall_score: Optional[float] = None
    evaluation_dataset: Optional[str] = None
    notes: str = "No predictive ML model found in target repository; classical ROC-AUC curve is not applicable to deterministic service architectures."

class VerificationReport(BaseModel):
    overall_trust_score: float = 95.0
    verdict: str = "VERIFIED_PRODUCTION_GRADE"  # VERIFIED_PRODUCTION_GRADE | VERIFIED_WITH_WARNINGS | REJECTED
    evidence_precision_score: float = 96.5      # % of cited code pointers verified in tree
    subsystem_recall_coverage: float = 94.0     # % of top-level code subsystems audited
    hallucination_rate: float = 2.0             # % ungrounded claims
    ml_audit: MLCodebaseAudit = MLCodebaseAudit()
    verified_claims_count: int = 0
    unsupported_claims_count: int = 0
    audit_findings: list[str] = []
    verification_agent_notes: str = ""

class AgentExtractionResult(BaseModel):
    project_name: str
    problem_statement: str
    tech_stack: list[str] = []
    architecture_mermaid_chart: str
    milestone_timeline_mermaid_chart: str
    analytics_metrics: AnalyticsMetrics
    presentation_deck: PresentationDeck
    developer_handover_guide: DeveloperHandoverGuide
    knowledge_items: list[KnowledgeItem] = []
    verification_report: Optional[VerificationReport] = None
