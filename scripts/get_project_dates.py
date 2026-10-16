# scripts/get_project_dates.py
import sys
import os
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 1. Local Projects in projects_store.json
print("=" * 80)
print("1. LOCAL PROJECTS (projects_store.json)")
print("=" * 80)

store_path = os.path.join(os.path.dirname(__file__), '..', 'projects_store.json')
if os.path.exists(store_path):
    with open(store_path, 'r', encoding='utf-8') as f:
        local_projects = json.load(f)

    print(f"Total Local Projects in PRISM UI: {len(local_projects)}\n")
    for idx, (pid, p) in enumerate(local_projects.items(), 1):
        print(f"[{idx}] Project ID : {pid}")
        print(f"    Title      : {p.get('title')}")
        print(f"    Repository : {p.get('owner')}/{p.get('repo')}")
        print(f"    Status     : {p.get('status')}")
        print(f"    Created    : {p.get('created_at')}")
        print(f"    AWS Pushed : {p.get('pushed_to_aws')}")
        print("-" * 60)
else:
    print("No projects_store.json found.")

# 2. Global PostgreSQL Database on AWS RDS
print("\n" + "=" * 80)
print("2. GLOBAL POSTGRESQL DATABASE (AWS Aurora RDS)")
print("=" * 80)

from app.core.db import VectorDatabase
db = VectorDatabase()

try:
    with db.get_connection() as conn:
        with conn.cursor() as cur:
            # Projects table in RDS
            cur.execute("""
                SELECT p.id, p.name, p.created_at, p.description, 
                       COALESCE(u.name, 'Unknown') as created_by_user,
                       pr.url as repo_url
                FROM projects p
                LEFT JOIN users u ON p.created_by = u.id
                LEFT JOIN project_repositories pr ON pr.project_id = p.id
                ORDER BY p.created_at ASC;
            """)
            db_projects = cur.fetchall()
            print(f"Total Projects in AWS RDS 'projects' table: {len(db_projects)}\n")

            for idx, row in enumerate(db_projects, 1):
                p_id, name, created_at, desc, user_name, repo_url = row
                day_name = created_at.strftime('%A') if hasattr(created_at, 'strftime') else 'Unknown'
                date_str = created_at.strftime('%Y-%m-%d %H:%M:%S UTC') if hasattr(created_at, 'strftime') else str(created_at)

                print(f"[{idx}] DB Project ID: {p_id}")
                print(f"    Project Name: {name}")
                print(f"    Repo URL    : {repo_url or 'N/A'}")
                print(f"    Created Date: {date_str}")
                print(f"    Day of Week : {day_name}")
                print(f"    Created By  : {user_name}")
                if desc:
                    print(f"    Description : {desc}")
                print("-" * 60)

            # Knowledge nodes (pgvector table) in RDS
            print("\n" + "=" * 80)
            print("3. VECTORIZED KNOWLEDGE NODES IN RDS (knowledge_nodes table)")
            print("=" * 80)
            cur.execute("""
                SELECT repository_name, COUNT(*) 
                FROM knowledge_nodes 
                GROUP BY repository_name 
                ORDER BY count DESC;
            """)
            nodes = cur.fetchall()
            print(f"Total Repositories with Vector Embeddings: {len(nodes)}\n")
            for repo_name, count in nodes:
                print(f"  • {repo_name:<45} : {count} vector embeddings")
            print("=" * 80)

except Exception as e:
    print(f"❌ RDS Query error: {e}")
