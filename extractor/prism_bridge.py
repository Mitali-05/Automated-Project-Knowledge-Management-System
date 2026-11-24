"""
PRISM bridge - connects the extraction pipeline (app/...) to the PRISM web backend.

Required stages (failures are reported as FAILED):
  1. polls the backend for repositories waiting for extraction (marked PENDING),
  2. runs the existing pipeline: MCP agent (LLM1) -> Verification agent (LLM2) -> PDF / PPTX generators,
  3. sends the results back through the backend's ingest API (knowledge items, full report, PDF, PPTX),
  4. reports SYNCED or FAILED.

It never touches the database. The backend owns the database; this script needs only the API URL and the
shared service key. Run it from the root of the extraction repository (the folder that contains `app/`):

    python prism_bridge.py

Settings (environment or .env):
    PRISM_API_URL        backend base URL                       (default http://localhost:8081)
    INGEST_SERVICE_KEY   must equal the backend's INGEST_SERVICE_KEY  (required)
    PRISM_POLL_SECONDS   how often to look for work             (default 10)
    Private GitHub credentials come from the backend workspace installation.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import sys
import time
import traceback
from pathlib import Path
from typing import Any, Optional

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env", override=False)

API_URL = os.getenv("PRISM_API_URL", "http://localhost:8080").rstrip("/")
SERVICE_KEY = os.getenv("INGEST_SERVICE_KEY", "").strip()
POLL_SECONDS = int(os.getenv("PRISM_POLL_SECONDS", "10"))
HTTP_TIMEOUT = 60

# The pipeline's knowledge types -> the labels shown in the web app.
TYPE_LABELS = {
    "TECHNICAL_DECISION": "Decision",
    "MODULE_RESPONSIBILITY": "Module Summary",
    "IMPLEMENTATION_DETAIL": "Implementation",
    "CONFIGURATION": "Configuration",
    "PROBLEM_RESOLUTION": "Troubleshooting",
    "DEPENDENCY": "Dependency",
}

log = logging.getLogger("prism.bridge")


class IngestResourceGone(RuntimeError):
    """The queued job's target is no longer available in the backend."""


class PrismApi:
    """Thin client for the backend's /api/ingest endpoints."""

    def __init__(self, base: str, key: str):
        self.base = base
        self.http = requests.Session()
        self.http.headers["X-Service-Key"] = key

    def _check(self, r: requests.Response) -> requests.Response:
        if r.status_code >= 400:
            message = f"{r.request.method} {r.request.path_url} -> HTTP {r.status_code}: {r.text[:300]}"
            if r.status_code == 404 and r.request.path_url.startswith(('/api/ingest/projects/', '/api/ingest/repositories/')):
                raise IngestResourceGone(message)
            raise RuntimeError(message)
        return r

    def repositories(self, status: str) -> list[dict]:
        r = self.http.get(f"{self.base}/api/ingest/repositories", params={"status": status}, timeout=HTTP_TIMEOUT)
        return self._check(r).json()

    def set_status(self, repo_id: int, status: str, message: Optional[str] = None) -> None:
        body: dict[str, Any] = {"status": status}
        if message:
            body["message"] = message[:490]
        self._check(self.http.post(f"{self.base}/api/ingest/repositories/{repo_id}/status", json=body, timeout=HTTP_TIMEOUT))

    def github_token(self, repo_id: int) -> str:
        """Require the backend workspace installation token; never use global credentials."""
        r = self.http.post(f"{self.base}/api/ingest/repositories/{repo_id}/github-token", timeout=HTTP_TIMEOUT)
        data = self._check(r).json()
        token = data.get("token")
        if not isinstance(token, str) or not token.strip():
            raise RuntimeError("Backend returned no GitHub installation token. Connect GitHub for this workspace.")
        return token

    def knowledge(self, project_id: int, repo_id: int, items: list[dict]) -> None:
        for i in range(0, len(items), 200):
            self._check(self.http.post(f"{self.base}/api/ingest/projects/{project_id}/knowledge",
                                       json={"repositoryId": repo_id, "items": items[i:i + 200]}, timeout=HTTP_TIMEOUT))

    def report(self, repo_id: int, report: dict) -> None:
        self._check(self.http.put(f"{self.base}/api/ingest/repositories/{repo_id}/report", json=report, timeout=HTTP_TIMEOUT))

    def report_file(self, repo_id: int, kind: str, content: bytes) -> None:
        self._check(self.http.put(f"{self.base}/api/ingest/repositories/{repo_id}/report/files/{kind}", data=content,
                                  headers={"Content-Type": "application/octet-stream"}, timeout=300))


def to_ingest_items(result, owner: str, name: str) -> list[dict]:
    """Maps the pipeline's KnowledgeItems to the backend's ingest format."""
    items: list[dict] = []
    for k in result.knowledge_items:
        title = (k.title or "").strip()[:500]
        if not title:
            continue
        details = (k.details or "").strip()
        if k.business_impact:
            details = f"{details}\n\nBusiness impact: {k.business_impact}".strip()
        evidence = []
        for ref in (k.evidence_ids or [])[:50]:
            ref = str(ref).strip()
            if not ref:
                continue
            looks_like_path = " " not in ref and not ref.startswith("http")
            evidence.append({
                "type": "FILE" if looks_like_path else "NOTE",
                "reference": ref[:500],
                "url": f"https://github.com/{owner}/{name}/blob/HEAD/{ref}"[:1000] if looks_like_path else (ref if ref.startswith("http") else None),
                "excerpt": None,
            })
        items.append({
            "externalId": hashlib.sha1(f"{owner}/{name}:{title.lower()}".encode("utf-8")).hexdigest(),
            "title": title,
            "type": TYPE_LABELS.get((k.knowledge_type or "").upper(), (k.knowledge_type or "Knowledge").replace("_", " ").title())[:50],
            "summary": (k.summary or title)[:7900],
            "details": details[:19900] or None,
            "module": (k.module or None) and k.module[:250],
            "confidence": max(0.0, min(1.0, float(k.confidence))) if k.confidence is not None else None,
            "evidence": evidence,
        })
    return items


def run_pipeline(repo: dict, token: str):
    """Runs the existing extraction pipeline. Returns (result, file_tree)."""
    from app.core.config import LLM1_API_KEY, LLM1_PROVIDER
    from app.core.llm_client import LLMClient
    from app.github.auth import check_repo_access, fetch_repo_tree
    from app.mcp.agent import run_autonomous_extraction
    from app.mcp.service import GitHubMCPClientService

    owner, name = repo["owner"], repo["name"]
    log_id = f"repo-{repo['repositoryId']}"

    tree = fetch_repo_tree(token, owner, name)
    if not tree:
        ok, reason = check_repo_access(token, owner, name)
        if not ok:
            raise RuntimeError(reason)

    llm = LLMClient(LLM1_PROVIDER, LLM1_API_KEY)

    async def go():
        if token is None:
            from app.mcp.public_session import PublicRepositorySession
            session = PublicRepositorySession(owner, name)
            await asyncio.to_thread(session.verify_public)
            return await run_autonomous_extraction(owner, name, llm, session, file_tree=tree, project_id=log_id)
        service = GitHubMCPClientService(access_token=token)
        async with service.connect() as session:
            return await run_autonomous_extraction(owner, name, llm, session, file_tree=tree, project_id=log_id)

    result, tools = asyncio.run(go())
    if not result or not result.knowledge_items:
        raise RuntimeError("No architectural knowledge could be synthesized from this repository.")
    log.info("Agent finished (%d tool calls, %d knowledge items)", len(tools), len(result.knowledge_items))

    from app.core.verification_agent import VerificationAgent
    result.verification_report = VerificationAgent().audit_extraction(
        result, file_tree=tree, owner=owner, repo=name, project_id=log_id)
    if result.verification_report.verdict in ("AUDIT_FAILED", "REJECTED"):
        raise RuntimeError("Verification did not pass: " + result.verification_report.verdict)
    return result, tree


def process(api: PrismApi, repo: dict) -> None:
    repo_id, project_id = repo["repositoryId"], repo["projectId"]
    owner, name = repo["owner"], repo["name"]
    label = f"{owner}/{name}"
    log.info("Claiming %s (repository %s, project %s)", label, repo_id, project_id)
    try:
        api.set_status(repo_id, "SYNCING")
        # Access mode is selected before authentication, never after an auth failure.
        if repo.get("githubInstallationId"):
            token = api.github_token(repo_id)
            log.info("Using authorized workspace installation for %s", label)
        else:
            from app.mcp.public_session import PublicRepositorySession
            PublicRepositorySession(owner, name).verify_public()
            token = None
            log.info("Using confirmed public access for %s", label)

        result, _tree = run_pipeline(repo, token)
        context = api.http.get(f"{api.base}/api/ingest/jira/context/{project_id}", timeout=HTTP_TIMEOUT)
        result.jira_context = api._check(context).json()

        api.knowledge(project_id, repo_id, to_ingest_items(result, owner, name))
        api.report(repo_id, result.model_dump(mode="json"))
        log.info("Saved knowledge and report for %s", label)

        # All required deliverables must succeed before reporting SYNCED.
        from app.utils.exporter import generate_pdf_report
        from app.utils.pptx_exporter import generate_pptx_deck
        # Validate both serialized documents before uploading either replacement.
        pdf = generate_pdf_report(result, owner, name)
        deck = generate_pptx_deck(result, owner, name)
        api.report_file(repo_id, "pdf", pdf)
        api.report_file(repo_id, "pptx", deck)

        api.set_status(repo_id, "SYNCED")
        log.info("Done: %s", label)
    except IngestResourceGone as e:
        log.warning('Cancelled obsolete extraction target (repository %s, project %s): %s', repo_id, project_id, e)
    except Exception as e:
        curr = e
        while hasattr(curr, "exceptions") and getattr(curr, "exceptions"):
            curr = curr.exceptions[0]
        err_msg = str(curr)
        log.error("Extraction failed for %s: %s", label, err_msg)
        log.debug(traceback.format_exc())
        try:
            api.set_status(repo_id, "FAILED", err_msg)
        except Exception as e2:
            log.error("Could not report the failure: %s", e2)


def refresh_jira_reports(api):
    import json
    import base64
    from app.core.models import AgentExtractionResult
    from app.utils.exporter import generate_pdf_report
    from app.utils.pptx_exporter import generate_pptx_deck
    response = api.http.post(f"{api.base}/api/ingest/jira/reports/claim", timeout=HTTP_TIMEOUT)
    for job in api._check(response).json():
        try:
            result = AgentExtractionResult.model_validate_json(job['report'])
            result.jira_context = job['issues']
            pdf = generate_pdf_report(result, job['repo_owner'], job['repo_name'])
            deck = generate_pptx_deck(result, job['repo_owner'], job['repo_name'])
            body = dict(id=job['id'], generatedAt=job['base_version'], report=result.model_dump(mode='json'),
                        pdf=base64.b64encode(pdf).decode(), pptx=base64.b64encode(deck).decode())
        except Exception as exc:
            log.error('Jira report refresh failed: %s', exc)
            body = dict(id=job['id'], generatedAt=job['base_version'], error=str(exc))
        saved = api.http.post(f"{api.base}/api/ingest/jira/reports/complete", json=body, timeout=300)
        api._check(saved)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    if not SERVICE_KEY:
        print("INGEST_SERVICE_KEY is not set. Use the same value as the backend's .env.", file=sys.stderr)
        return 1
    api = PrismApi(API_URL, SERVICE_KEY)
    root = Path(__file__).resolve().parent
    revision = hashlib.sha256()
    for relative in ['prism_bridge.py', 'app/mcp/agent.py', 'app/mcp/report_output.py',
                       'app/prompts/agent_prompts.py', 'app/core/models.py',
                       'app/core/verification_agent.py', 'app/core/llm_client.py', 'app/mcp/render_contract.py',
                       'app/prompts/report_authoring.md', 'app/utils/exporter.py',
                       'app/utils/pptx_exporter.py', 'app/utils/publication_contract.py']:
        revision.update((root / relative).read_bytes())
    log.info('Worker code: %s | revision %s | Python %s',
             Path(__file__).resolve(), revision.hexdigest()[:12], sys.executable)
    log.info("PRISM bridge started. Backend: %s, polling every %ss", API_URL, POLL_SECONDS)

    # A previous run that was killed mid-extraction leaves repositories stuck in SYNCING.
    try:
        for r in api.repositories("SYNCING"):
            api.set_status(r["repositoryId"], "FAILED", "Interrupted when the extractor restarted. Press Sync now to retry.")
    except Exception as e:
        log.warning("Could not check for interrupted work: %s", e)

    while True:
        try:
            refresh_jira_reports(api)
            for repo in api.repositories("PENDING"):
                process(api, repo)
        except requests.RequestException as e:
            log.warning("Backend not reachable (%s). Retrying...", e)
        except Exception as e:
            log.error("Unexpected error: %s", e)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("Stopped.")
