# scripts/check_db.py
"""
Utility script to inspect all PostgreSQL / RDS tables, schema, row counts, and sample data.

Usage:
    python scripts/check_db.py                  # Inspect all tables, schemas, and sample rows
    python scripts/check_db.py --summary        # Quick summary: list all tables and row counts
    python scripts/check_db.py --table users    # Inspect specific table 'users'
    python scripts/check_db.py --limit 10       # Show 10 rows per table
"""
import sys
import os
import argparse

# Ensure utf-8 encoding on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.db import VectorDatabase

def inspect_database(target_table=None, limit=5, summary_only=False):
    db = VectorDatabase()
    print("=" * 80)
    print(f"Connecting to database '{db.dbname}' at {db.host}:{db.port} as '{db.user}'...")
    print("=" * 80)

    try:
        conn = db.get_connection()
    except Exception as e:
        print(f"[!] Connection failed: {e}")
        return

    try:
        with conn:
            with conn.cursor() as cur:
                # 1. Fetch all public tables
                cur.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    ORDER BY table_name;
                """)
                tables = [r[0] for r in cur.fetchall()]

                if not tables:
                    print("[*] No user tables found in the 'public' schema.")
                    return

                print(f"[+] Found {len(tables)} table(s) in schema 'public':\n")

                # Summary Table View
                print(f"{'#':<4} {'Table Name':<35} {'Total Rows':<12}")
                print("-" * 55)
                table_counts = {}
                for idx, t in enumerate(tables, 1):
                    try:
                        cur.execute(f'SELECT COUNT(*) FROM "{t}";')
                        cnt = cur.fetchone()[0]
                    except Exception:
                        cnt = "Error"
                    table_counts[t] = cnt
                    print(f"{idx:<4} {t:<35} {str(cnt):<12}")
                print("-" * 55)

                if summary_only:
                    return

                print("\n" + "=" * 80)
                print("DETAILED TABLE SCHEMAS & DATA")
                print("=" * 80 + "\n")

                for table in tables:
                    if target_table and table.lower() != target_table.lower():
                        continue

                    count = table_counts.get(table, 0)

                    # Get columns
                    cur.execute("""
                        SELECT column_name, data_type, character_maximum_length, is_nullable
                        FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = %s
                        ORDER BY ordinal_position;
                    """, (table,))
                    cols = cur.fetchall()

                    print(f"--- TABLE: {table} (Total Rows: {count}) ---")
                    print("-" * 80)
                    print(f"{'Column Name':<28} {'Data Type':<22} {'Nullable':<10}")
                    print("-" * 80)
                    for c_name, c_type, c_len, c_null in cols:
                        type_str = f"{c_type}({c_len})" if c_len else c_type
                        print(f"{c_name:<28} {type_str:<22} {c_null:<10}")

                    # Fetch sample data
                    if isinstance(count, int) and count > 0:
                        cur.execute(f'SELECT * FROM "{table}" LIMIT %s;', (limit,))
                        rows = cur.fetchall()
                        col_names = [desc[0] for desc in cur.description]

                        print(f"\nSample Data (Showing top {min(len(rows), limit)} of {count} rows):")
                        for idx, row in enumerate(rows, 1):
                            print(f"\n  [Row #{idx}]")
                            for col_name, val in zip(col_names, row):
                                str_val = str(val) if val is not None else "NULL"
                                if col_name == 'embedding' and (str_val.startswith('[') or str_val.startswith('{')):
                                    str_val = f"<VECTOR(768) length=768>"
                                elif len(str_val) > 120:
                                    str_val = str_val[:117] + "..."
                                print(f"    {col_name:<24}: {str_val}")
                    else:
                        print("\n  (Table is empty - 0 rows)")

                    print("\n" + "=" * 80 + "\n")
    except Exception as e:
        print(f"[!] Query execution error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check all database tables and their data.")
    parser.add_argument("--table", type=str, default=None, help="Specific table name to inspect")
    parser.add_argument("--limit", type=int, default=5, help="Number of sample rows to print per table (default: 5)")
    parser.add_argument("--summary", action="store_true", help="Print only table summary and row counts")
    args = parser.parse_args()

    inspect_database(target_table=args.table, limit=args.limit, summary_only=args.summary)
