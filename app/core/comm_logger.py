"""
Communication Logger for PRISM Agent Pipeline.

Stores all agent ↔ LLM conversations and agent ↔ agent data exchanges
in structured JSONL files under: logs/<project_id>/

Files produced:
  - llm1_report_agent.jsonl    → Every prompt/response between ReportAgent and LLM1 (Gemini)
  - llm2_verification_agent.jsonl → Every prompt/response between VerificationAgent and LLM2 (Bedrock)
  - agent_to_agent.jsonl       → Data passed from ReportAgent → VerificationAgent and back
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).parent.parent.parent
LOGS_ROOT = PROJECT_ROOT / "logs"


def _get_project_log_dir(project_id: str) -> Path:
    """Returns the log directory for a specific project, creating it if needed."""
    log_dir = LOGS_ROOT / project_id
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def _timestamp() -> str:
    """ISO 8601 UTC timestamp."""
    return datetime.now(timezone.utc).isoformat()


def _append_jsonl(filepath: Path, record: dict):
    """Append a single JSON record to a JSONL file."""
    with open(filepath, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")


# ── LLM1 (ReportAgent ↔ Gemini) Logging ───────────────────────────

def log_llm1_request(
    project_id: str,
    step: int,
    messages: List[Dict[str, Any]],
    model: str,
    tools_count: int = 0
):
    """Log the request sent from ReportAgent to LLM1."""
    log_dir = _get_project_log_dir(project_id)
    filepath = log_dir / "llm1_report_agent.jsonl"

    # Serialize messages safely (handle OpenAI message objects)
    serialized_messages = []
    for msg in messages:
        if hasattr(msg, "model_dump"):
            serialized_messages.append(msg.model_dump())
        elif isinstance(msg, dict):
            serialized_messages.append(msg)
        else:
            serialized_messages.append({"raw": str(msg)})

    record = {
        "timestamp": _timestamp(),
        "direction": "AGENT → LLM1",
        "event": "REQUEST",
        "step": step,
        "model": model,
        "tools_available": tools_count,
        "message_count": len(messages),
        "messages": serialized_messages
    }
    _append_jsonl(filepath, record)


def log_llm1_response(
    project_id: str,
    step: int,
    model: str,
    response_content: Optional[str] = None,
    tool_calls: Optional[List[Dict[str, Any]]] = None,
    finish_reason: str = "",
    is_final_output: bool = False
):
    """Log the response received by ReportAgent from LLM1."""
    log_dir = _get_project_log_dir(project_id)
    filepath = log_dir / "llm1_report_agent.jsonl"

    record = {
        "timestamp": _timestamp(),
        "direction": "LLM1 → AGENT",
        "event": "RESPONSE",
        "step": step,
        "model": model,
        "finish_reason": finish_reason,
        "is_final_output": is_final_output,
        "response_text": response_content[:10000] if response_content else None,
        "tool_calls": tool_calls
    }
    _append_jsonl(filepath, record)


def log_llm1_tool_execution(
    project_id: str,
    step: int,
    tool_name: str,
    tool_args: dict,
    tool_result: str,
    tool_call_id: str = ""
):
    """Log a tool execution triggered by LLM1's response."""
    log_dir = _get_project_log_dir(project_id)
    filepath = log_dir / "llm1_report_agent.jsonl"

    record = {
        "timestamp": _timestamp(),
        "direction": "AGENT → MCP_TOOL",
        "event": "TOOL_EXECUTION",
        "step": step,
        "tool_name": tool_name,
        "tool_call_id": tool_call_id,
        "tool_args": tool_args,
        "tool_result_preview": tool_result[:5000] if tool_result else None,
        "tool_result_length": len(tool_result) if tool_result else 0
    }
    _append_jsonl(filepath, record)


def log_llm1_error(project_id: str, step: int, error: str, context: str = ""):
    """Log an error that occurred during LLM1 communication."""
    log_dir = _get_project_log_dir(project_id)
    filepath = log_dir / "llm1_report_agent.jsonl"

    record = {
        "timestamp": _timestamp(),
        "direction": "AGENT",
        "event": "ERROR",
        "step": step,
        "error": error,
        "context": context
    }
    _append_jsonl(filepath, record)


# ── LLM2 (VerificationAgent ↔ Bedrock) Logging ────────────────────

def log_llm2_request(
    project_id: str,
    system_prompt: str,
    user_content: str,
    model: str,
    provider: str,
    temperature: float = 0.0
):
    """Log the request sent from VerificationAgent to LLM2."""
    log_dir = _get_project_log_dir(project_id)
    filepath = log_dir / "llm2_verification_agent.jsonl"

    record = {
        "timestamp": _timestamp(),
        "direction": "AGENT → LLM2",
        "event": "REQUEST",
        "model": model,
        "provider": provider,
        "temperature": temperature,
        "system_prompt": system_prompt,
        "user_content": user_content[:15000]
    }
    _append_jsonl(filepath, record)


def log_llm2_response(
    project_id: str,
    model: str,
    provider: str,
    raw_response: Any,
    parsed_successfully: bool = True,
    error: str = ""
):
    """Log the response received by VerificationAgent from LLM2."""
    log_dir = _get_project_log_dir(project_id)
    filepath = log_dir / "llm2_verification_agent.jsonl"

    # Safely serialize the response
    if isinstance(raw_response, dict):
        response_data = raw_response
    elif hasattr(raw_response, "model_dump"):
        response_data = raw_response.model_dump()
    else:
        response_data = str(raw_response)[:10000]

    record = {
        "timestamp": _timestamp(),
        "direction": "LLM2 → AGENT",
        "event": "RESPONSE",
        "model": model,
        "provider": provider,
        "parsed_successfully": parsed_successfully,
        "response_data": response_data,
        "error": error if error else None
    }
    _append_jsonl(filepath, record)


def log_llm2_fallback(project_id: str, reason: str, fallback_report: dict):
    """Log when VerificationAgent falls back to deterministic audit."""
    log_dir = _get_project_log_dir(project_id)
    filepath = log_dir / "llm2_verification_agent.jsonl"

    record = {
        "timestamp": _timestamp(),
        "direction": "AGENT",
        "event": "DETERMINISTIC_FALLBACK",
        "reason": reason,
        "fallback_report": fallback_report
    }
    _append_jsonl(filepath, record)


# ── Agent-to-Agent Communication Logging ───────────────────────────

def log_agent_handoff(
    project_id: str,
    from_agent: str,
    to_agent: str,
    payload_summary: dict,
    payload_size_bytes: int = 0,
    context: str = ""
):
    """Log data exchange between agents (ReportAgent → VerificationAgent or vice versa)."""
    log_dir = _get_project_log_dir(project_id)
    filepath = log_dir / "agent_to_agent.jsonl"

    record = {
        "timestamp": _timestamp(),
        "event": "HANDOFF",
        "from_agent": from_agent,
        "to_agent": to_agent,
        "context": context,
        "payload_size_bytes": payload_size_bytes,
        "payload_summary": payload_summary
    }
    _append_jsonl(filepath, record)


def log_agent_result(
    project_id: str,
    agent_name: str,
    result_summary: dict,
    status: str = "SUCCESS",
    context: str = ""
):
    """Log the final result produced by an agent."""
    log_dir = _get_project_log_dir(project_id)
    filepath = log_dir / "agent_to_agent.jsonl"

    record = {
        "timestamp": _timestamp(),
        "event": "AGENT_RESULT",
        "agent_name": agent_name,
        "status": status,
        "context": context,
        "result_summary": result_summary
    }
    _append_jsonl(filepath, record)


def log_pipeline_event(project_id: str, event: str, details: dict = None):
    """Log a pipeline-level event (start, complete, error)."""
    log_dir = _get_project_log_dir(project_id)
    filepath = log_dir / "agent_to_agent.jsonl"

    record = {
        "timestamp": _timestamp(),
        "event": event,
        "details": details or {}
    }
    _append_jsonl(filepath, record)
