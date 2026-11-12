import os
import logging
from typing import Optional, List, Dict, Any
import psycopg2
from pgvector.psycopg2 import register_vector
from dotenv import load_dotenv

load_dotenv(override=True)

logger = logging.getLogger(__name__)

class VectorDatabase:
    def __init__(self):
        self.host = os.getenv("DB_HOST", "localhost")
        self.port = os.getenv("DB_PORT", "5432")
        self.dbname = os.getenv("DB_NAME", "postgres")
        self.user = os.getenv("DB_USER", "postgres")
        self.password = os.getenv("DB_PASSWORD", "")
        
    def get_connection(self):
        if not self.password:
            logger.warning("DB_PASSWORD is empty. Database operations will likely fail.")
        # Automatically disable SSL for localhost unless explicitly overridden
        default_ssl = 'disable' if self.host in ('localhost', '127.0.0.1') else 'require'
        ssl_mode = os.getenv("DB_SSLMODE", default_ssl)
        
        conn = psycopg2.connect(
            host=self.host,
            port=self.port,
            dbname=self.dbname,
            user=self.user,
            password=self.password,
            sslmode=ssl_mode
        )
        return conn

    def initialize_schema(self):
        """Creates the vector extension and the knowledge_nodes table if they don't exist."""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS knowledge_nodes (
                            id SERIAL PRIMARY KEY,
                            repository_name VARCHAR(255),
                            knowledge_type VARCHAR(50),
                            title VARCHAR(255),
                            summary TEXT,
                            details TEXT,
                            evidence TEXT,
                            embedding VECTOR(768)
                        );
                    """)
                conn.commit()
                logger.info("Database schema initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize database schema: {e}")

    def insert_knowledge(self, repository_name: str, knowledge_type: str, title: str, summary: str, details: str, evidence: str, embedding: list):
        """Inserts a single vectorized knowledge item into the database."""
        try:
            with self.get_connection() as conn:
                register_vector(conn)
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO knowledge_nodes 
                        (repository_name, knowledge_type, title, summary, details, evidence, embedding)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (repository_name, knowledge_type, title, summary, details, evidence, embedding))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to insert knowledge node: {e}")
            raise e

    def save_full_project(
        self,
        project_name: str,
        repo_url: str,
        problem_statement: str,
        knowledge_items: list,
        vectors: list,
        user_id: int = 1,
        org_id: int = 1,
        result_data: dict = None
    ) -> int:
        """
        Commits a finalized project, repository link, relational knowledge items,
        pgvector embeddings, and full synthesized blueprint to AWS RDS in an ACID transaction.
        """
        import json
        try:
            with self.get_connection() as conn:
                register_vector(conn)
                with conn.cursor() as cur:
                    # 1. Insert into projects table (including result_data JSON payload)
                    if hasattr(result_data, 'model_dump'):
                        result_dict = result_data.model_dump()
                    elif isinstance(result_data, dict):
                        result_dict = result_data
                    else:
                        result_dict = None
                    result_json = json.dumps(result_dict) if result_dict else None

                    cur.execute("""
                        INSERT INTO projects (org_id, name, description, created_by, created_at, result_data)
                        VALUES (%s, %s, %s, %s, NOW(), %s)
                        RETURNING id;
                    """, (org_id, project_name, (problem_statement or "")[:500], user_id, result_json))
                    db_proj_id = cur.fetchone()[0]

                    # 2. Add owner to project_members table
                    cur.execute("""
                        INSERT INTO project_members (project_id, user_id, role, added_at)
                        VALUES (%s, %s, 'owner', NOW());
                    """, (db_proj_id, user_id))

                    # 3. Insert repository record
                    cur.execute("""
                        INSERT INTO project_repositories (project_id, url, provider, created_at)
                        VALUES (%s, %s, 'GITHUB', NOW())
                        RETURNING id;
                    """, (db_proj_id, repo_url))
                    repo_id = cur.fetchone()[0]

                    # 4. Insert knowledge_items & vectorized knowledge_nodes
                    for idx, item in enumerate(knowledge_items):
                        if isinstance(item, dict):
                            item_title = item.get('title', '')
                            item_ktype = item.get('knowledge_type', 'TECHNICAL_DECISION')
                            item_summary = item.get('summary', '')
                            item_details = item.get('details', '')
                            item_module = item.get('module', '')
                            item_conf = float(item.get('confidence', 0.95))
                            item_ev = item.get('evidence_ids', [])
                        else:
                            item_title = getattr(item, 'title', '')
                            item_ktype = getattr(item, 'knowledge_type', 'TECHNICAL_DECISION')
                            item_summary = getattr(item, 'summary', '')
                            item_details = getattr(item, 'details', '')
                            item_module = getattr(item, 'module', '')
                            item_conf = float(getattr(item, 'confidence', 0.95))
                            item_ev = getattr(item, 'evidence_ids', [])

                        ev_str = ",".join(item_ev) if isinstance(item_ev, list) else str(item_ev)

                        cur.execute("""
                            INSERT INTO knowledge_items 
                            (project_id, repository_id, title, knowledge_type, summary, details, module, confidence, evidence_ids, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW());
                        """, (db_proj_id, repo_id, str(item_title)[:512], str(item_ktype)[:100], str(item_summary), str(item_details), str(item_module)[:255], item_conf, ev_str))

                        # Insert vector embedding into knowledge_nodes
                        if idx < len(vectors) and vectors[idx]:
                            repo_short = repo_url.replace("https://github.com/", "").replace(".git", "")
                            cur.execute("""
                                INSERT INTO knowledge_nodes 
                                (repository_name, knowledge_type, title, summary, details, evidence, embedding)
                                VALUES (%s, %s, %s, %s, %s, %s, %s);
                            """, (repo_short, str(item_ktype)[:50], str(item_title)[:255], str(item_summary), str(item_details), ev_str, vectors[idx]))

                conn.commit()
                logger.info(f"Committed project {project_name} (ID: {db_proj_id}) to AWS RDS.")
                return db_proj_id
        except Exception as e:
            logger.error(f"Failed to save full project to RDS: {e}")
            raise e

    def get_projects_for_user(self, user_id: int = None) -> list:
        """
        Fetches all projects from AWS RDS.
        In multi-user mode, filters strictly by user_id to ensure tenant isolation.
        """
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    if user_id:
                        cur.execute("""
                            SELECT p.id, p.name, p.description, p.created_at, pr.url,
                                   (SELECT COUNT(*) FROM knowledge_items ki WHERE ki.project_id = p.id) as item_count
                            FROM projects p
                            JOIN project_members pm ON pm.project_id = p.id
                            LEFT JOIN project_repositories pr ON pr.project_id = p.id
                            WHERE pm.user_id = %s
                            ORDER BY p.created_at DESC;
                        """, (user_id,))
                    else:
                        cur.execute("""
                            SELECT p.id, p.name, p.description, p.created_at, pr.url,
                                   (SELECT COUNT(*) FROM knowledge_items ki WHERE ki.project_id = p.id) as item_count
                            FROM projects p
                            LEFT JOIN project_repositories pr ON pr.project_id = p.id
                            ORDER BY p.created_at DESC;
                        """)
                    rows = cur.fetchall()
                    result = []
                    for r in rows:
                        result.append({
                            "id": r[0],
                            "name": r[1],
                            "description": r[2],
                            "created_at": str(r[3]),
                            "repo_url": r[4] or "",
                            "knowledge_items_count": r[5] or 0
                        })
                    return result
        except Exception as e:
            logger.error(f"Failed to fetch projects from RDS: {e}")
            return []

    def get_project_by_id(self, project_id: int, user_id: int = None) -> Optional[dict]:
        """
        Retrieves a full project directly from AWS RDS PostgreSQL.
        Enforces tenant isolation by checking project_members if user_id is provided.
        """
        import json
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    if user_id:
                        cur.execute("""
                            SELECT p.id, p.name, p.description, p.created_at, pr.url, p.result_data
                            FROM projects p
                            JOIN project_members pm ON pm.project_id = p.id
                            LEFT JOIN project_repositories pr ON pr.project_id = p.id
                            WHERE p.id = %s AND pm.user_id = %s;
                        """, (project_id, user_id))
                    else:
                        cur.execute("""
                            SELECT p.id, p.name, p.description, p.created_at, pr.url, p.result_data
                            FROM projects p
                            LEFT JOIN project_repositories pr ON pr.project_id = p.id
                            WHERE p.id = %s;
                        """, (project_id,))
                    row = cur.fetchone()
                    if not row:
                        return None
                    
                    db_id, name, desc, created_at, url, result_data = row
                    
                    # Fetch knowledge items from relational table
                    cur.execute("""
                        SELECT title, knowledge_type, summary, details, module, confidence, evidence_ids
                        FROM knowledge_items
                        WHERE project_id = %s
                        ORDER BY id ASC;
                    """, (db_id,))
                    ki_rows = cur.fetchall()
                    ki_list = []
                    for ki in ki_rows:
                        ev_raw = ki[6] or ""
                        ev_list = [x.strip() for x in ev_raw.split(",") if x.strip()] if ev_raw else []
                        ki_list.append({
                            "title": ki[0],
                            "knowledge_type": ki[1],
                            "summary": ki[2],
                            "details": ki[3] or "",
                            "module": ki[4] or "",
                            "confidence": float(ki[5] or 0.95),
                            "evidence_ids": ev_list
                        })
                    
                    if isinstance(result_data, str):
                        result_data = json.loads(result_data)
                    elif result_data is None:
                        result_data = {}

                    # Ensure knowledge_items in result_data reflect relational DB
                    if ki_list:
                        result_data["knowledge_items"] = ki_list
                    if not result_data.get("project_name"):
                        result_data["project_name"] = name
                    if not result_data.get("problem_statement"):
                        result_data["problem_statement"] = desc

                    owner, repo = "", name
                    if url and "github.com/" in url:
                        parts = url.split("github.com/")[1].rstrip("/").split("/")
                        if len(parts) >= 2:
                            owner, repo = parts[0], parts[1].replace(".git", "")

                    return {
                        "id": f"db-{db_id}",
                        "db_id": db_id,
                        "title": name,
                        "description": desc or "",
                        "repo_url": url or "",
                        "owner": owner,
                        "repo": repo,
                        "status": "COMPLETED",
                        "progress": 100,
                        "status_message": "Loaded directly from AWS Aurora PostgreSQL.",
                        "created_at": str(created_at),
                        "result_data": result_data,
                        "pushed_to_aws": True,
                        "source": "database"
                    }
        except Exception as e:
            logger.error(f"Failed to fetch project {project_id} from RDS: {e}")
            return None

    def delete_project_by_id(self, project_id: int):
        """Purges a specific project by database ID from all relational and vector tables."""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT url FROM project_repositories WHERE project_id = %s;", (project_id,))
                    urls = [r[0] for r in cur.fetchall()]
                    for url in urls:
                        repo_short = url.replace("https://github.com/", "").replace(".git", "")
                        cur.execute("DELETE FROM knowledge_nodes WHERE repository_name = %s;", (repo_short,))

                    cur.execute("DELETE FROM knowledge_items WHERE project_id = %s;", (project_id,))
                    cur.execute("DELETE FROM project_members WHERE project_id = %s;", (project_id,))
                    cur.execute("DELETE FROM project_repositories WHERE project_id = %s;", (project_id,))
                    cur.execute("DELETE FROM projects WHERE id = %s;", (project_id,))
                conn.commit()
                logger.info(f"Purged project ID {project_id} from AWS RDS.")
        except Exception as e:
            logger.error(f"Failed to purge project ID {project_id} from RDS: {e}")

    def delete_project_data(self, repository_name: str):
        """Purges a repository from knowledge_nodes, project_repositories, and projects in RDS."""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # 1. Delete vector nodes
                    cur.execute("DELETE FROM knowledge_nodes WHERE repository_name = %s;", (repository_name,))
                    
                    # 2. Find and delete projects matching repository URL
                    repo_pattern = f"%{repository_name}%"
                    cur.execute("SELECT project_id FROM project_repositories WHERE url LIKE %s;", (repo_pattern,))
                    pids = [r[0] for r in cur.fetchall()]
                    for pid in pids:
                        cur.execute("DELETE FROM knowledge_items WHERE project_id = %s;", (pid,))
                        cur.execute("DELETE FROM project_members WHERE project_id = %s;", (pid,))
                        cur.execute("DELETE FROM project_repositories WHERE project_id = %s;", (pid,))
                        cur.execute("DELETE FROM projects WHERE id = %s;", (pid,))
                conn.commit()
                logger.info(f"Purged project data for {repository_name} from AWS RDS.")
        except Exception as e:
            logger.error(f"Failed to purge project data from RDS: {e}")
