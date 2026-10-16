"""
Standalone Background Worker for PRISM Extraction.

This script runs as an independent subprocess, completely decoupled from
the Streamlit process. It reads/writes progress directly to projects_store.json
so the UI can poll status without any in-memory thread dependency.

Usage:
    python -m app.core.worker <project_id> <provider> <llm_key> <github_token> <push_to_aws>
"""
import sys
import os
import json
import asyncio
import logging
import traceback
from pathlib import Path

# Add right after imports:
if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Ensure the project root is in sys.path
PROJECT_ROOT = str(Path(__file__).parent.parent.parent)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv
load_dotenv(override=True)

STORE_FILE = Path(PROJECT_ROOT) / "projects_store.json"
LOG_DIR = Path(PROJECT_ROOT) / "logs"
LOG_DIR.mkdir(exist_ok=True)

# ── Helpers: Atomic read/write of projects_store.json ──────────────

import filelock

LOCK_FILE = STORE_FILE.with_suffix(".lock")


def _read_store() -> dict:
    """Read the projects store file safely."""
    if not STORE_FILE.exists():
        return {}
    try:
        with open(STORE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _write_store(data: dict):
    """Write the projects store file safely with file locking."""
    lock = filelock.FileLock(str(LOCK_FILE), timeout=10)
    with lock:
        with open(STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)


def _update_project(project_id: str, updates: dict):
    """Atomically update a project's fields in the store."""
    lock = filelock.FileLock(str(LOCK_FILE), timeout=10)
    with lock:
        store = _read_store()
        if project_id not in store:
            return
        store[project_id].update(updates)
        with open(STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(store, f, indent=2)


# ── Main Worker Logic ──────────────────────────────────────────────

def run_extraction(project_id: str, provider: str, llm_key: str, github_token: str, push_to_aws: bool, user_id: int = 1, org_id: int = 1):
    """Execute the full extraction pipeline for a project."""
    
    # Set up logging for this worker
    log_file = LOG_DIR / f"{project_id}.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.FileHandler(str(log_file), encoding="utf-8"),
            logging.StreamHandler(sys.stdout)
        ]
    )
    logger = logging.getLogger(f"worker.{project_id}")
    logger.info(f"Worker started for project {project_id}")

    store = _read_store()
    proj = store.get(project_id)
    if not proj:
        logger.error(f"Project {project_id} not found in store.")
        return

    owner = proj["owner"]
    repo = proj["repo"]

    # Auto-resolve github_token if not passed or empty
    if not github_token:
        github_token = os.getenv("GITHUB_TOKEN") or os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN") or ""
        if not github_token:
            app_id = os.getenv("GITHUB_APP_ID")
            inst_id = os.getenv("GITHUB_INSTALLATION_ID")
            pem_files = list(Path(PROJECT_ROOT).glob("*.pem"))
            if app_id and inst_id and pem_files:
                try:
                    from app.github.auth import get_installation_access_token
                    github_token = get_installation_access_token(app_id, str(pem_files[0]), inst_id)
                    logger.info("Automatically generated GitHub App installation token for worker.")
                except Exception as te:
                    logger.warning(f"Could not auto-generate GitHub App token: {te}")

    try:
        # ── Phase 1: Fetch repo tree ───────────────────────────
        _update_project(project_id, {
            "status": "ANALYZING",
            "progress": 25,
            "status_message": "Inspecting directory structure & file tree..."
        })
        logger.info("Phase 1: Fetching repository tree...")

        from app.github.auth import fetch_repo_tree
        tree = fetch_repo_tree(github_token, owner, repo)
        logger.info(f"Fetched {len(tree)} tree entries.")

        # ── Phase 2: Autonomous agent extraction ───────────────
        _update_project(project_id, {
            "progress": 45,
            "status_message": "Autonomous agent auditing modules & tracing data flows..."
        })
        logger.info("Phase 2: Running autonomous agent extraction...")

        from app.core.config import LLM1_PROVIDER, LLM1_API_KEY
        from app.core.llm_client import LLMClient
        from app.mcp.service import GitHubMCPClientService
        from app.mcp.agent import run_autonomous_extraction
        from app.core.comm_logger import (
            log_agent_handoff, log_agent_result, log_pipeline_event
        )

        llm_client = LLMClient(provider or LLM1_PROVIDER, llm_key or LLM1_API_KEY)

        # ── Log pipeline start ──
        log_pipeline_event(project_id, "PIPELINE_START", {
            "owner": owner,
            "repo": repo,
            "llm1_provider": provider or LLM1_PROVIDER,
            "llm1_model": llm_client.model,
            "tree_entries": len(tree)
        })

        async def execute_agent():
            service = GitHubMCPClientService(access_token=github_token)
            async with service.connect() as session:
                return await run_autonomous_extraction(
                    owner, repo, llm_client, session,
                    file_tree=tree, project_id=project_id
                )

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result, executed_tools = loop.run_until_complete(execute_agent())
        loop.close()

        logger.info(f"Agent completed. Tools executed: {len(executed_tools)}")

        if not result or not result.knowledge_items:
            log_pipeline_event(project_id, "PIPELINE_FAILED", {
                "reason": "No knowledge items produced by ReportAgent"
            })
            _update_project(project_id, {
                "status": "FAILED",
                "status_message": "No architectural knowledge could be synthesized.",
                "staging_buffer": None
            })
            logger.error("Extraction produced no knowledge items.")
            return

        # ── Log ReportAgent result ──
        log_agent_result(project_id, "ReportAgent (LLM1)", {
            "project_name": result.project_name,
            "knowledge_items_count": len(result.knowledge_items),
            "tech_stack": result.tech_stack,
            "complexity": result.analytics_metrics.estimated_complexity,
            "core_modules": result.analytics_metrics.core_module_count,
            "tools_executed": executed_tools
        }, status="SUCCESS", context="Autonomous extraction complete")

        # ── Phase 3: Staging ───────────────────────────────────
        _update_project(project_id, {
            "progress": 80,
            "status_message": "Synthesizing executive blueprints & generating charts...",
            "staging_buffer": result.model_dump()
        })
        logger.info("Phase 3: Staged extraction result.")

        # ── Phase 4: Verification Agent (LLM2) ────────────────
        _update_project(project_id, {
            "progress": 90,
            "status_message": "Verification Agent (LLM2) auditing evidence citations and grounding metrics..."
        })
        logger.info("Phase 4: Running Verification Agent...")

        # ── Log agent-to-agent handoff: ReportAgent → VerificationAgent ──
        handoff_payload = {
            "project_name": result.project_name,
            "knowledge_items_count": len(result.knowledge_items),
            "knowledge_titles": [k.title for k in result.knowledge_items],
            "tech_stack": result.tech_stack,
            "evidence_ids_all": [
                eid for k in result.knowledge_items for eid in k.evidence_ids
            ],
            "core_module_count": result.analytics_metrics.core_module_count,
            "patterns_claimed": result.analytics_metrics.key_patterns_used,
            "problem_statement_preview": result.problem_statement[:300]
        }
        result_dump = result.model_dump()
        log_agent_handoff(
            project_id=project_id,
            from_agent="ReportAgent (LLM1)",
            to_agent="VerificationAgent (LLM2)",
            payload_summary=handoff_payload,
            payload_size_bytes=len(json.dumps(result_dump, default=str).encode("utf-8")),
            context="Passing extraction result for independent verification audit"
        )

        try:
            from app.core.verification_agent import VerificationAgent
            verifier = VerificationAgent()
            v_report = verifier.audit_extraction(
                result, file_tree=tree, owner=owner, repo=repo,
                project_id=project_id
            )
            result.verification_report = v_report
            _update_project(project_id, {
                "staging_buffer": result.model_dump()
            })
            logger.info("Verification Agent completed successfully.")

            # ── Log VerificationAgent result ──
            log_agent_result(project_id, "VerificationAgent (LLM2)", {
                "overall_trust_score": v_report.overall_trust_score,
                "verdict": v_report.verdict,
                "evidence_precision": v_report.evidence_precision_score,
                "subsystem_recall": v_report.subsystem_recall_coverage,
                "hallucination_rate": v_report.hallucination_rate,
                "verified_claims": v_report.verified_claims_count,
                "unsupported_claims": v_report.unsupported_claims_count,
                "ml_detected": v_report.ml_audit.ml_models_detected if v_report.ml_audit else False
            }, status="SUCCESS", context="Verification audit complete")

            # ── Log agent-to-agent handoff: VerificationAgent → Pipeline ──
            log_agent_handoff(
                project_id=project_id,
                from_agent="VerificationAgent (LLM2)",
                to_agent="Pipeline (Final Commit)",
                payload_summary={
                    "trust_score": v_report.overall_trust_score,
                    "verdict": v_report.verdict,
                    "audit_findings": v_report.audit_findings
                },
                context="Returning verified report to pipeline for final commit"
            )

        except Exception as ve:
            logger.warning(f"Verification Agent notice: {ve}")
            log_agent_result(project_id, "VerificationAgent (LLM2)", {
                "error": str(ve)
            }, status="FAILED", context="Verification agent encountered an error")

        # ── Final Commit & Optional Cloud Push ───────────────────
        store = _read_store()
        proj_latest = store.get(project_id, {})
        final_data = proj_latest.get("staging_buffer") or result.model_dump()

        pushed = False
        db_proj_id = None
        if push_to_aws:
            try:
                _update_project(project_id, {
                    "status_message": "Committing verified blueprints and embeddings to AWS Aurora PostgreSQL..."
                })
                from app.core.db import VectorDatabase
                db = VectorDatabase()
                db.initialize_schema()
                vectors = []
                for item in result.knowledge_items:
                    embed_text = f"Title: {item.title}\nSummary: {item.summary}\nModule: {item.module}"
                    vector = llm_client.embed_text(embed_text)
                    vectors.append(vector)
                
                db_proj_id = db.save_full_project(
                    project_name=result.project_name,
                    repo_url=f"https://github.com/{owner}/{repo}",
                    problem_statement=result.problem_statement,
                    knowledge_items=result.knowledge_items,
                    vectors=vectors,
                    user_id=user_id,
                    org_id=org_id,
                    result_data=final_data
                )
                pushed = True
                logger.info(f"AWS push completed successfully with DB Project ID: {db_proj_id}")
            except Exception as de:
                logger.warning(f"Failed to push to AWS: {de}")

        # When pushed to AWS, purge local payload to keep local disk clean
        _update_project(project_id, {
            "result_data": None if pushed else final_data,
            "staging_buffer": None,
            "status": "COMPLETED",
            "progress": 100,
            "status_message": "Architectural synthesis complete. Synced to AWS Aurora RDS." if pushed else "Architectural synthesis complete. Stored in local session.",
            "pushed_to_aws": pushed,
            "db_id": db_proj_id
        })

        # ── Log pipeline completion ──
        log_pipeline_event(project_id, "PIPELINE_COMPLETE", {
            "knowledge_items": len(result.knowledge_items),
            "tools_executed": len(executed_tools),
            "pushed_to_aws": pushed,
            "has_verification": result.verification_report is not None
        })
        logger.info(f"[SUCCESS] Project {project_id} completed successfully.")

    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        logger.error(traceback.format_exc())
        _update_project(project_id, {
            "status": "FAILED",
            "status_message": f"Extraction failed: {str(e)}",
            "staging_buffer": None
        })


# ── CLI Entry Point ────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Usage: python -m app.core.worker <project_id> <provider> <llm_key> <github_token> <push_to_aws> [user_id] [org_id]")
        sys.exit(1)

    pid = sys.argv[1]
    prov = sys.argv[2] if sys.argv[2] != "__NONE__" else None
    key = sys.argv[3] if sys.argv[3] != "__NONE__" else None
    gh_token = sys.argv[4] if sys.argv[4] != "__NONE__" else ""
    push = sys.argv[5].lower() == "true"
    u_id = int(sys.argv[6]) if len(sys.argv) > 6 and sys.argv[6].isdigit() else 1
    o_id = int(sys.argv[7]) if len(sys.argv) > 7 and sys.argv[7].isdigit() else 1

    run_extraction(pid, prov, key, gh_token, push, user_id=u_id, org_id=o_id)
