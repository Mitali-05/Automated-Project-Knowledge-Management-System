from typing import Optional
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

class AgentExtractionResult(BaseModel):
    project_name: str
    problem_statement: str
    tech_stack: list[str] = []
    architecture_mermaid_chart: str
    analytics_metrics: AnalyticsMetrics
    presentation_deck: PresentationDeck
    knowledge_items: list[KnowledgeItem] = []
