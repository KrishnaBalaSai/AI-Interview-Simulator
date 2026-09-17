import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import CodingProblem, PracticeQuestion

def export_all():
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "data")
    os.makedirs(data_dir, exist_ok=True)
    db = SessionLocal()

    # 1. Export Coding Problems
    probs = db.query(CodingProblem).order_by(CodingProblem.id).all()
    coding_list = []
    for p in probs:
        coding_list.append({
            "title": p.title,
            "slug": p.slug,
            "difficulty": p.difficulty,
            "category": p.category,
            "pattern": p.pattern,
            "strategy": p.strategy,
            "identification": p.identification,
            "reference": p.reference,
            "leetcode_url": p.leetcode_url,
            "gfg_url": p.gfg_url,
            "youtube_url": p.youtube_url,
            "companies": p.companies or [],
            "description": p.description,
            "constraints": p.constraints,
            "examples": p.examples or [],
            "starter_templates": p.starter_templates or {},
            "test_cases": p.test_cases or []
        })

    coding_file = os.path.join(data_dir, "coding_problems.json")
    with open(coding_file, "w", encoding="utf-8") as f:
        json.dump(coding_list, f, indent=2, ensure_ascii=False)
    print(f"[Export] Saved {len(coding_list)} coding problems to {coding_file}")

    # 2. Export Practice Questions
    questions = db.query(PracticeQuestion).order_by(PracticeQuestion.id).all()
    practice_list = []
    for q in questions:
        practice_list.append({
            "category": q.category,
            "difficulty": q.difficulty,
            "title": q.title,
            "question_text": q.question_text,
            "options": q.options,
            "explanation": q.explanation,
            "sample_answer": q.sample_answer,
            "tags": q.tags or []
        })

    practice_file = os.path.join(data_dir, "practice_questions.json")
    with open(practice_file, "w", encoding="utf-8") as f:
        json.dump(practice_list, f, indent=2, ensure_ascii=False)
    print(f"[Export] Saved {len(practice_list)} practice questions to {practice_file}")

if __name__ == "__main__":
    export_all()
