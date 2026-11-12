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
                    "pushed_to_aws": p_copy.get("pushed_to_aws", False),
                    "db_id": p_copy.get("db_id")
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

    def list_projects(self, user_id: int = None) -> List[Dict[str, Any]]:
        """
        Returns all projects.
        First queries persistent projects from AWS RDS PostgreSQL (filtered by user_id for multi-tenancy).
        Second merges any active/in-flight local projects from disk.
        """
        all_projects = {}

        # 1. Fetch persistent projects from AWS RDS Database
        try:
            from app.core.db import VectorDatabase
            db = VectorDatabase()
            db_projects = db.get_projects_for_user(user_id=user_id)
            for db_p in db_projects:
                db_id = db_p["id"]
                url = db_p.get("repo_url", "")
                owner, repo = "", db_p["name"]
                if url and "github.com/" in url:
                    parts = url.split("github.com/")[1].rstrip("/").split("/")
                    if len(parts) >= 2:
                        owner, repo = parts[0], parts[1].replace(".git", "")

                pid = f"db-{db_id}"
                all_projects[pid] = {
                    "id": pid,
                    "db_id": db_id,
                    "title": db_p["name"],
                    "description": db_p.get("description", ""),
                    "repo_url": url,
                    "owner": owner,
                    "repo": repo,
                    "status": "COMPLETED",
                    "progress": 100,
                    "status_message": "Loaded directly from AWS Aurora PostgreSQL.",
                    "created_at": db_p.get("created_at", ""),
                    "result_data": None,  # Lazy loaded on click
                    "pushed_to_aws": True,
                    "source": "database"
                }
        except Exception as e:
            # If RDS is offline or unreachable, proceed with local store
            pass

        # 2. Merge local store (in-flight/analyzing or not pushed to AWS)
        local_store = self._load_from_store_raw()
        for pid, pdata in local_store.items():
            # If a local project was already pushed to AWS and has a db_id, link it
            db_id = pdata.get("db_id")
            if db_id and f"db-{db_id}" in all_projects:
                # DB already has it; DB copy takes precedence
                continue
            if pid not in all_projects or pdata.get("status") == "ANALYZING":
                all_projects[pid] = pdata

        return list(all_projects.values())

    def get_project(self, project_id: str, user_id: int = None) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single project.
        If backed by AWS RDS, fetches verified data directly from PostgreSQL.
        """
        if str(project_id).startswith("db-"):
            try:
                db_id = int(str(project_id).replace("db-", ""))
                from app.core.db import VectorDatabase
                db = VectorDatabase()
                return db.get_project_by_id(db_id, user_id=user_id)
            except Exception as e:
                print(f"Error fetching db project {project_id}: {e}")
                return None

        proj = self.projects.get(project_id)
        if proj:
            # If project was pushed to AWS and local result_data was cleaned, load from DB
            if proj.get("pushed_to_aws") and not proj.get("result_data"):
                from app.core.db import VectorDatabase
                db = VectorDatabase()
                db_id = proj.get("db_id")
                if db_id:
                    db_proj = db.get_project_by_id(db_id, user_id=user_id)
                    if db_proj:
                        return db_proj

                # Fallback: look up by repo URL in RDS
                url = proj.get("repo_url", "")
                if url:
                    db_projects = db.get_projects_for_user(user_id=user_id)
                    for dp in db_projects:
                        if dp.get("repo_url") == url or (proj.get("repo") and proj.get("repo").lower() in (dp.get("repo_url") or "").lower()):
                            db_proj = db.get_project_by_id(dp["id"], user_id=user_id)
                            if db_proj:
                                # Backfill db_id into local project reference
                                self._update_project(project_id, {"db_id": dp["id"]})
                                return db_proj
        return proj

    def delete_project(self, project_id: str, clear_database: bool = True):
        """Deletes a project from BOTH local store and AWS RDS PostgreSQL."""
        # 1. Kill worker subprocess if running
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
        proj = projects.get(project_id)

        target_db_id = None
        target_repo = ""

        if str(project_id).startswith("db-"):
            try:
                target_db_id = int(str(project_id).replace("db-", ""))
            except Exception:
                pass
        
        if proj:
            target_db_id = target_db_id or proj.get("db_id")
            owner = proj.get("owner", "")
            repo = proj.get("repo", "")
            target_repo = f"{owner}/{repo}" if owner and repo else ""

        # 2. Clean from global AWS RDS PostgreSQL if synced
        if clear_database:
            try:
                from app.core.db import VectorDatabase
                db = VectorDatabase()
                if target_db_id:
                    db.delete_project_by_id(target_db_id)
                if target_repo:
                    db.delete_project_data(target_repo)
            except Exception as de:
                print(f"Notice cleaning AWS RDS: {de}")

        # 3. Clean from local store (projects_store.json)
        # Match by direct key OR by db_id OR by repository slug
        keys_to_remove = set()
        for pid, pdata in projects.items():
            if pid == project_id:
                keys_to_remove.add(pid)
            elif target_db_id and pdata.get("db_id") == target_db_id:
                keys_to_remove.add(pid)
            elif target_repo and (target_repo in pdata.get("repo_url", "") or f"{pdata.get('owner','')}/{pdata.get('repo','')}" == target_repo):
                keys_to_remove.add(pid)

        for k in keys_to_remove:
            if k in projects:
                del projects[k]

        self._save_to_store(projects)

        # 4. Clean cached diagram PNGs
        if target_repo:
            import glob
            owner_clean = target_repo.split("/")[0] if "/" in target_repo else ""
            repo_clean = target_repo.split("/")[1] if "/" in target_repo else ""
            for diag_file in glob.glob(f"generated_diagrams/{owner_clean}_{repo_clean}_*.png"):
                try:
                    os.remove(diag_file)
                except Exception:
                    pass

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
        push_to_aws: bool = False,
        user_id: int = 1,
        org_id: int = 1
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
            str(push_to_aws).lower(),
            str(user_id),
            str(org_id)
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

    def sync_to_aws_rds(self, project_id: str, provider: str, llm_key: str, user_id: int = 1, org_id: int = 1) -> bool:
        """Manually synchronizes a completed project to AWS RDS Vector Database."""
        proj = self.get_project(project_id, user_id=user_id)
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
                result_data=raw_data
            )
            # Purge local result_data so local disk remains clean; link to db_id
            self._update_project(project_id, {
                "pushed_to_aws": True,
                "db_id": db_proj_id,
                "result_data": None
            })
            return True
        except Exception as e:
            print(f"AWS RDS Sync failed: {e}")
            raise e
