"""
Utility Script: Sync & Migrate All Data (390 Coding Problems + 18 Practice Questions) to Neon DB (or any PostgreSQL instance).

Usage:
    python backend/sync_to_neon.py "postgresql://username:password@ep-xyz.neon.tech/neondb?sslmode=require"
"""

import sys
import os
import json
import argparse

# Ensure utf-8 output on Windows console
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models import Base, User, Profile, PracticeQuestion, CodingProblem
from app.auth import get_password_hash

def sync_data(database_url: str):
    print("=" * 60)
    print("[SYNC] AI INTERVIEW SIMULATOR - NEON DB SYNC UTILITY")
    print("=" * 60)

    if not database_url:
        print("[ERROR] No database URL provided.")
        print("Usage: python backend/sync_to_neon.py \"<NEON_DATABASE_URL>\"")
        sys.exit(1)

    print(f"\n[1/5] Connecting to target database...")
    clean_url = database_url.split("@")[-1] if "@" in database_url else database_url
    print(f"      Host/DB: ...@{clean_url}")

    try:
        engine = create_engine(
            database_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 20}
        )
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("      [OK] Connected successfully to Neon PostgreSQL!")
    except Exception as e:
        print(f"      [FAILED] Connection failed: {e}")
        sys.exit(1)

    # 2. Create Schema
    print("\n[2/5] Creating all database tables in Neon DB...")
    Base.metadata.create_all(bind=engine)
    print("      [OK] Tables created / verified.")

    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        data_dir = os.path.join(BASE_DIR, "app", "data")
        practice_file = os.path.join(data_dir, "practice_questions.json")
        coding_file = os.path.join(data_dir, "coding_problems.json")

        # 3. Seed / Sync Practice Questions
        print("\n[3/5] Syncing Practice Questions...")
        existing_pq_count = db.query(PracticeQuestion).count()
        if existing_pq_count == 0 and os.path.exists(practice_file):
            with open(practice_file, "r", encoding="utf-8") as f:
                practice_list = json.load(f)
            for p in practice_list:
                db.add(PracticeQuestion(
                    category=p["category"],
                    difficulty=p["difficulty"],
                    title=p["title"],
                    question_text=p["question_text"],
                    options=p.get("options"),
                    explanation=p["explanation"],
                    sample_answer=p["sample_answer"],
                    tags=p.get("tags", [])
                ))
            db.commit()
            print(f"      [OK] Inserted {len(practice_list)} practice questions into Neon DB!")
        else:
            print(f"      [INFO] Practice Questions already exist ({existing_pq_count} found).")

        # 4. Seed / Sync Coding Problems
        print("\n[4/5] Syncing Coding Problems (Authentic LeetCode DSA Sheet)...")
        existing_cp_slugs = set(s[0] for s in db.query(CodingProblem.slug).all())
        if os.path.exists(coding_file):
            with open(coding_file, "r", encoding="utf-8") as f:
                coding_list = json.load(f)

            new_problems = []
            for p in coding_list:
                if p["slug"] not in existing_cp_slugs:
                    new_problems.append(CodingProblem(
                        title=p["title"],
                        slug=p["slug"],
                        difficulty=p["difficulty"],
                        category=p["category"],
                        pattern=p.get("pattern"),
                        strategy=p.get("strategy"),
                        identification=p.get("identification"),
                        reference=p.get("reference"),
                        leetcode_url=p.get("leetcode_url"),
                        gfg_url=p.get("gfg_url"),
                        youtube_url=p.get("youtube_url"),
                        companies=p.get("companies", []),
                        description=p["description"],
                        constraints=p["constraints"],
                        examples=p.get("examples", []),
                        starter_templates=p.get("starter_templates", {}),
                        test_cases=p.get("test_cases", [])
                    ))

            if new_problems:
                db.bulk_save_objects(new_problems)
                db.commit()
                print(f"      [OK] Added {len(new_problems)} new coding problems! Total: {len(existing_cp_slugs) + len(new_problems)} problems.")
            else:
                print(f"      [INFO] All {len(existing_cp_slugs)} coding problems are already up-to-date in Neon DB.")
        else:
            print(f"      [WARN] {coding_file} not found. Skipped.")

        # 5. Create Admin Account
        print("\n[5/5] Ensuring Admin Account...")
        admin_email = "srinivas.kandagatla7@gmail.com"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                name="Srinivas Kandagatla",
                email=admin_email,
                hashed_password=get_password_hash("password123"),
                is_admin=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"      [OK] Created Admin User '{admin_email}' (password: password123).")
        else:
            if not admin.is_admin:
                admin.is_admin = True
                db.commit()
                print(f"      [OK] Updated '{admin_email}' with is_admin = True.")
            else:
                print(f"      [INFO] Admin user '{admin_email}' already configured.")

        # Summary
        final_pq = db.query(PracticeQuestion).count()
        final_cp = db.query(CodingProblem).count()

        print("\n" + "=" * 60)
        print("[COMPLETE] NEON DB SYNC SUCCESSFUL!")
        print("=" * 60)
        print(f"  * Practice Questions in Neon: {final_pq}")
        print(f"  * Coding Problems in Neon:    {final_cp}")
        print(f"  * Admin User:                 {admin_email} (is_admin: True)")
        print("\nNext step: Set this connection string as DATABASE_URL in your Render backend!")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Error during data sync: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync all questions and problems to Neon DB")
    parser.add_argument("url", nargs="?", help="Neon PostgreSQL Connection URL", default="")
    args = parser.parse_args()

    url = args.url or os.getenv("TARGET_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not url:
        url = input("Enter your Neon PostgreSQL connection string:\n> ").strip()

    sync_data(url)
