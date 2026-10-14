# app/core/project_manager.py
import os
import json
import uuid
import subprocess
import sys
import threading
from typing import Dict, List, Optional, Any
from pathlib import Path
from app.core.models import AgentExtractionResult
from app.utils.exporter import generate_pdf_report
from app.utils.pptx_exporter import generate_pptx_deck
from app.core.llm_client import LLMClient
from app.core.db import VectorDatabase

STORE_FILE = Path(__file__).parent.parent.parent / "projects_store.json"
LOCK_FILE = STORE_FILE.with_suffix(".lock")
PROJECT_ROOT = str(Path(__file__).parent.parent.parent)

try:
    import filelock
except ImportError:
    filelock = None


class ProjectManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ProjectManager, cls).__new__(cls)
                cls._instance._init_manager()
            return cls._instance

    def _init_manager(self):
        self.worker_processes: Dict[str, subprocess.Popen] = {}
        self._load_from_store()

    @property
    def projects(self) -> Dict[str, Dict[str, Any]]:
        """Always read fresh from disk to stay in sync with background workers."""
        return self._load_from_store_raw()

    def _load_from_store_raw(self) -> dict:
        """Reads projects from the persistent JSON store."""
        if STORE_FILE.exists():
            try:
                with open(STORE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading {STORE_FILE}: {e}")
        return {}

    def _load_from_store(self):
        """Initial load — seeds sample project if store doesn't exist."""
        if STORE_FILE.exists():
            return

        # If store does not exist but raw_knowledge.json is present, seed with it as an initial project
        raw_path = Path(__file__).parent.parent.parent / "raw_knowledge.json"
        if raw_path.exists():
            try:
                with open(raw_path, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                
                proj_id = "proj-payshield"
                projects = {
                    proj_id: {
                        "id": proj_id,
                        "title": raw_data.get("project_name", "PayShield-API"),
                        "description": "High-throughput distributed payment settlement and tokenization engine.",
                        "repo_url": "https://github.com/mitali/PayShield-API",
                        "owner": "mitali",
                        "repo": "PayShield-API",
                        "status": "COMPLETED",
                        "progress": 100,
                        "status_message": "Analysis completed successfully.",
                        "created_at": "2026-10-14 10:00:00",
                        "result_data": raw_data,
                        "pushed_to_aws": False
                    }
                }
                self._save_to_store(projects)
            except Exception as e:
                print(f"Could not seed sample project: {e}")

    def _save_to_store(self, projects: dict):
        """Persists project metadata to JSON with file locking."""
        try:
            clean_projects = {}
            for pid, pdata in projects.items():
                p_copy = dict(pdata)
                clean_projects[pid] = {
                    "id": p_copy.get("id"),
                    "title": p_copy.get("title"),
                    "description": p_copy.get("description"),
                    "repo_url": p_copy.get("repo_url"),
                    "owner": p_copy.get("owner"),
                    "repo": p_copy.get("repo"),
                    "status": p_copy.get("status"),
                    "progress": p_copy.get("progress", 0),
                    "status_message": p_copy.get("status_message", ""),
                    "created_at": p_copy.get("created_at", ""),
                    "result_data": p_copy.get("result_data"),
                    "pushed_to_aws": p_copy.get("pushed_to_aws", False)
                }

            if filelock:
                lock = filelock.FileLock(str(LOCK_FILE), timeout=10)
                with lock:
                    with open(STORE_FILE, "w", encoding="utf-8") as f:
                        json.dump(clean_projects, f, indent=2)
            else:
                with open(STORE_FILE, "w", encoding="utf-8") as f:
                    json.dump(clean_projects, f, indent=2)
        except Exception as e:
            print(f"Failed to persist {STORE_FILE}: {e}")

    def _update_project(self, project_id: str, updates: dict):
        """Atomically update a single project's fields."""
        projects = self.projects
        if project_id not in projects:
            return
        projects[project_id].update(updates)
        self._save_to_store(projects)

    def list_projects(self) -> List[Dict[str, Any]]:
        """Returns all registered projects (always fresh from disk)."""
        return list(self.projects.values())

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single project by ID (always fresh from disk)."""
        return self.projects.get(project_id)

    def delete_project(self, project_id: str):
        """Deletes a project and kills any running worker process."""
        # Kill worker subprocess if running
        proc = self.worker_processes.get(project_id)
        if proc and proc.poll() is None:
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        self.worker_processes.pop(project_id, None)

        projects = self.projects
        if project_id in projects:
            del projects[project_id]
            self._save_to_store(projects)

    def create_project(self, title: str, description: str, repo_url: str, owner: str, repo: str) -> str:
        """Initializes a new project in ANALYZING status."""
        project_id = f"proj-{uuid.uuid4().hex[:8]}"
        projects = self.projects
        projects[project_id] = {
            "id": project_id,
            "title": title or repo,
            "description": description or f"Architectural synthesis of {owner}/{repo}",
            "repo_url": repo_url,
            "owner": owner,
            "repo": repo,
            "status": "ANALYZING",
            "progress": 10,
            "status_message": "Connecting to repository via MCP tools...",
            "created_at": "Just now",
            "result_data": None,
            "staging_buffer": None,
            "pushed_to_aws": False
        }
        self._save_to_store(projects)
        return project_id

    def cancel_analysis(self, project_id: str):
        """Cancels an in-flight analysis job by terminating the worker subprocess."""
        # Kill worker subprocess
        proc = self.worker_processes.get(project_id)
        if proc and proc.poll() is None:
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        self.worker_processes.pop(project_id, None)

        self._update_project(project_id, {
            "status": "CANCELLED",
            "status_message": "Analysis aborted by user. Staging buffer flushed.",
            "staging_buffer": None
        })

    def start_background_analysis(
        self,
        project_id: str,
        provider: str = None,
        llm_key: str = None,
        github_token: str = "",
        push_to_aws: bool = False
    ):
        """
        Spawns a completely independent subprocess for extraction.
        
        The subprocess runs app/core/worker.py as a standalone Python script,
        writing progress updates directly to projects_store.json.
        
        This process survives:
        - Browser tab switches
        - Page refreshes
        - Streamlit session resets
        - Navigation to different views
        """
        python_exe = sys.executable
        worker_module = "app.core.worker"

        args = [
            python_exe, "-m", worker_module,
            project_id,
            provider or "__NONE__",
            llm_key or "__NONE__",
            github_token or "__NONE__",
            str(push_to_aws).lower()
        ]

        # Create log directory
        log_dir = Path(PROJECT_ROOT) / "logs"
        log_dir.mkdir(exist_ok=True)
        log_file = log_dir / f"{project_id}.log"

        # Spawn a fully detached subprocess
        # On Windows, use CREATE_NEW_PROCESS_GROUP and DETACHED_PROCESS flags
        # so the worker survives even if the parent Streamlit process restarts
        creation_flags = 0
        if sys.platform == "win32":
            creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW

        proc = subprocess.Popen(
            args,
            cwd=PROJECT_ROOT,
            stdout=open(str(log_file), "a", encoding="utf-8"),
            stderr=subprocess.STDOUT,
            creationflags=creation_flags,
            start_new_session=(sys.platform != "win32"),
        )

        self.worker_processes[project_id] = proc
        print(f"[ProjectManager] Spawned worker subprocess PID={proc.pid} for {project_id}")

    def is_worker_running(self, project_id: str) -> bool:
        """Check if a worker subprocess is still running for a project."""
        proc = self.worker_processes.get(project_id)
        if proc and proc.poll() is None:
            return True
        return False

    def sync_to_aws_rds(self, project_id: str, provider: str, llm_key: str) -> bool:
        """Manually synchronizes a completed project to AWS RDS Vector Database."""
        proj = self.get_project(project_id)
        if not proj or proj.get("status") != "COMPLETED" or not proj.get("result_data"):
            return False

        try:
            raw_data = proj["result_data"]
            result = AgentExtractionResult.model_validate(raw_data)
            llm_client = LLMClient(provider, llm_key)
            db = VectorDatabase()
            db.initialize_schema()
            owner = proj["owner"]
            repo = proj["repo"]

            for item in result.knowledge_items:
                embed_text = f"Title: {item.title}\nSummary: {item.summary}\nModule: {item.module}"
                vector = llm_client.embed_text(embed_text)
                db.insert_knowledge(
                    repository_name=f"{owner}/{repo}",
                    knowledge_type=item.knowledge_type,
                    title=item.title,
                    summary=item.summary,
                    details=item.details or "",
                    evidence=",".join(item.evidence_ids) if item.evidence_ids else "",
                    embedding=vector
                )
            self._update_project(project_id, {"pushed_to_aws": True})
            return True
        except Exception as e:
            print(f"AWS RDS Sync failed: {e}")
            raise e
