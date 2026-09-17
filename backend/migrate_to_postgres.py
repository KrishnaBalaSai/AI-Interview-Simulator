import os
import sys
import json
import sqlite3
from datetime import datetime

# Add current directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from app.models import (
    Base,
    User,
    Profile,
    Resume,
    PracticeQuestion,
    PracticeAttempt,
    CodingProblem,
    CodingSubmission,
    Interview,
    InterviewQuestion,
    InterviewResponse,
    AIEvaluation,
    InterviewEvent,
    Report,
)

PG_DATABASE_URL = os.getenv(
    "PG_DATABASE_URL",
    "postgresql://postgres:root@localhost:5432/ai_interview_sim"
)
SQLITE_PATH = os.path.join(backend_dir, "interview_sim.db")

# Models in topological/dependency order
TABLE_MODELS = [
    ("users", User),
    ("practice_questions", PracticeQuestion),
    ("coding_problems", CodingProblem),
    ("profiles", Profile),
    ("resumes", Resume),
    ("practice_attempts", PracticeAttempt),
    ("coding_submissions", CodingSubmission),
    ("interviews", Interview),
    ("interview_questions", InterviewQuestion),
    ("interview_responses", InterviewResponse),
    ("interview_events", InterviewEvent),
    ("ai_evaluations", AIEvaluation),
    ("reports", Report),
]

def parse_val(val, col_type):
    if val is None:
        return None
    type_str = str(col_type).upper()
    if "JSON" in type_str:
        if isinstance(val, str):
            try:
                return json.loads(val)
            except Exception:
                return val
        return val
    if "DATETIME" in type_str or "TIMESTAMP" in type_str:
        if isinstance(val, str):
            try:
                return datetime.fromisoformat(val)
            except Exception:
                for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
                    try:
                        return datetime.strptime(val, fmt)
                    except ValueError:
                        pass
                return val
        return val
    if "BOOLEAN" in type_str:
        if isinstance(val, (int, str)):
            return bool(int(val)) if str(val).isdigit() else val.lower() in ("true", "1")
        return bool(val)
    return val

def migrate():
    print("=" * 60)
    print("AI Interview Simulator: SQLite -> PostgreSQL Migration")
    print("=" * 60)

    if not os.path.exists(SQLITE_PATH):
        print(f"Error: SQLite database file not found at {SQLITE_PATH}")
        sys.exit(1)

    print(f"[1/5] Connecting to PostgreSQL at {PG_DATABASE_URL}...")
    pg_engine = create_engine(PG_DATABASE_URL)
    
    # Test connection
    with pg_engine.connect() as conn:
        res = conn.execute(text("SELECT version();")).scalar()
        print(f"      PostgreSQL Connected: {res[:40]}...")

    print("[2/5] Creating all tables in PostgreSQL from SQLAlchemy models...")
    Base.metadata.create_all(bind=pg_engine)
    print("      Tables ready.")

    print(f"[3/5] Reading data from SQLite ({SQLITE_PATH})...")
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    PgSession = sessionmaker(bind=pg_engine)
    pg_session = PgSession()

    try:
        print("[4/5] Migrating records table by table...")
        for table_name, model_class in TABLE_MODELS:
            mapper = inspect(model_class)
            col_type_map = {col.key: col.type for col in mapper.columns}

            sqlite_cur.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cur.fetchall()
            print(f"      - {table_name}: found {len(rows)} records in SQLite...")

            # Clean any existing rows in PG if re-running
            pg_session.query(model_class).delete()
            pg_session.flush()

            records_to_add = []
            for row in rows:
                record_dict = {}
                for key in row.keys():
                    if key in col_type_map:
                        record_dict[key] = parse_val(row[key], col_type_map[key])
                records_to_add.append(model_class(**record_dict))

            if records_to_add:
                pg_session.add_all(records_to_add)
                pg_session.flush()

            # Update PostgreSQL sequence to max(id)
            seq_sql = text(f"""
                SELECT setval(
                    pg_get_serial_sequence('{table_name}', 'id'),
                    coalesce((SELECT max(id) FROM {table_name}), 1),
                    (SELECT max(id) FROM {table_name}) IS NOT NULL
                );
            """)
            try:
                pg_session.execute(seq_sql)
            except Exception as seq_err:
                print(f"        Notice on sequence update for {table_name}: {seq_err}")

        pg_session.commit()
        print("      All data committed to PostgreSQL successfully.")

    except Exception as e:
        pg_session.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        pg_session.close()
        sqlite_conn.close()

    print("[5/5] Verifying row counts...")
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_cur = sqlite_conn.cursor()
    all_match = True

    with pg_engine.connect() as conn:
        for table_name, _ in TABLE_MODELS:
            sqlite_count = sqlite_cur.execute(f"SELECT count(*) FROM {table_name}").fetchone()[0]
            pg_count = conn.execute(text(f"SELECT count(*) FROM {table_name}")).scalar()
            match_status = "OK" if sqlite_count == pg_count else "MISMATCH"
            print(f"      {table_name:22}: SQLite={sqlite_count:3} | Postgres={pg_count:3} -> {match_status}")
            if sqlite_count != pg_count:
                all_match = False

    sqlite_conn.close()

    if all_match:
        print("\n Migration completed successfully! 100% of rows match between SQLite and PostgreSQL.")
    else:
        print("\n Migration completed with some row count discrepancies.")

if __name__ == "__main__":
    migrate()
