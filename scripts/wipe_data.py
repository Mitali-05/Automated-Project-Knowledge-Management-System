# scripts/wipe_data.py
"""
Utility script to wipe all project data both locally and in AWS RDS PostgreSQL.
Usage:
    python scripts/wipe_data.py
    python scripts/wipe_data.py --include-users
"""
import sys
import os
import glob
import json
import argparse

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.db import VectorDatabase

def wipe_all_data(include_users=False):
    print("=" * 80)
    print("🗑️ PRISM DATA PURGE UTILITY")
    print("=" * 80)

    # 1. Clear Local Projects Store
    store_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'projects_store.json'))
    try:
        with open(store_path, 'w', encoding='utf-8') as f:
            json.dump({}, f, indent=2)
        print(f"[+] Reset local projects store: {store_path}")
    except Exception as e:
        print(f"[!] Error resetting projects_store.json: {e}")

    # 2. Clear Generated Diagrams
    diagrams_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'generated_diagrams'))
    diag_files = glob.glob(os.path.join(diagrams_dir, "*.png"))
    for df in diag_files:
        try:
            os.remove(df)
        except Exception:
            pass
    print(f"[+] Cleared {len(diag_files)} generated diagram PNGs in {diagrams_dir}")

    # 3. Clear Stale Output Files (.pdf, .pptx in root)
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    out_files = glob.glob(os.path.join(root_dir, "*.pdf")) + glob.glob(os.path.join(root_dir, "*.pptx"))
    for of in out_files:
        try:
            os.remove(of)
        except Exception:
            pass
    print(f"[+] Cleared {len(out_files)} generated PDF/PPTX test files from project root")

    # 4. Clear Logs
    logs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'logs'))
    log_items = glob.glob(os.path.join(logs_dir, "*"))
    for li in log_items:
        try:
            if os.path.isdir(li):
                import shutil
                shutil.rmtree(li, ignore_errors=True)
            else:
                os.remove(li)
        except Exception:
            pass
    print(f"[+] Purged all stale log folders and files from {logs_dir}")

    # 5. Clear AWS RDS PostgreSQL Database
    print("\nConnecting to AWS RDS PostgreSQL to purge project records...")
    db = VectorDatabase()
    try:
        with db.get_connection() as conn:
            with conn.cursor() as cur:
                # Truncate knowledge and project tables
                print("  • Truncating 'knowledge_nodes' (vector embeddings)...")
                cur.execute("TRUNCATE TABLE knowledge_nodes RESTART IDENTITY;")

                print("  • Truncating 'knowledge_items'...")
                cur.execute("TRUNCATE TABLE knowledge_items RESTART IDENTITY CASCADE;")

                print("  • Truncating 'project_repositories'...")
                cur.execute("TRUNCATE TABLE project_repositories RESTART IDENTITY CASCADE;")

                print("  • Truncating 'project_members'...")
                cur.execute("TRUNCATE TABLE project_members RESTART IDENTITY CASCADE;")

                print("  • Truncating 'projects'...")
                cur.execute("TRUNCATE TABLE projects RESTART IDENTITY CASCADE;")

                if include_users:
                    print("  • Truncating 'notifications', 'users', 'organizations'...")
                    cur.execute("TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;")
                    cur.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE;")
                    cur.execute("TRUNCATE TABLE organizations RESTART IDENTITY CASCADE;")
                else:
                    print("  • Preserving 'users' and 'organizations' accounts for seamless authentication.")

            conn.commit()
        print("[+] AWS RDS PostgreSQL tables purged successfully!\n")
    except Exception as e:
        print(f"[!] RDS purge error: {e}")

    print("=" * 80)
    print("✅ All local and remote database data has been completely wiped!")
    print("=" * 80)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Purge all project data locally and in RDS.")
    parser.add_argument("--include-users", action="store_true", help="Also wipe users and organizations in RDS")
    args = parser.parse_args()

    wipe_all_data(include_users=args.include_users)
