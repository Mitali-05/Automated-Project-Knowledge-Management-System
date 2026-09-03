from typing import Optional
from pydantic import BaseModel, Field


class KnowledgeItem(BaseModel):
    title: str
    knowledge_type: str  # TECHNICAL_DECISION | MODULE_RESPONSIBILITY | IMPLEMENTATION_DETAIL | CONFIGURATION | PROBLEM_RESOLUTION | DEPENDENCY
    summary: str
    details: str
    module: Optional[str] = None
    confidence: float = Field(ge=0, le=1)
    evidence_ids: list[str] = []


class Evidence(BaseModel):
    id: str
    source_type: str  # commit | pull_request | changed_file | review | comment | source_file
    source_id: str
    title: str
    url: str = ""
    excerpt: str = ""
