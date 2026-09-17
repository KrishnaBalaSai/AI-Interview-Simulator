from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import (
    User,
    Profile,
    Interview,
    Report,
    PracticeQuestion,
    PracticeAttempt,
    CodingProblem,
    CodingSubmission,
)
from ..schemas import (
    AdminStats,
    AdminUserOut,
    PracticeQuestionResponse,
    PracticeQuestionCreateOrUpdate,
    CodingProblemDetail,
    CodingProblemCreateOrUpdate,
)
from ..dependencies import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Panel"])

# --- Platform Overview & KPI Stats ---
@router.get("/stats", response_model=AdminStats)
def get_admin_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total_users = db.query(User).count()
    total_interviews = db.query(Interview).count()
    completed_interviews = db.query(Interview).filter(Interview.status == "completed").count()

    avg_score = (
        db.query(func.avg(Interview.overall_score))
        .filter(Interview.status == "completed")
        .scalar()
    ) or 0.0

    total_practice_attempts = db.query(PracticeAttempt).count()
    total_coding_submissions = db.query(CodingSubmission).count()
    total_practice_questions = db.query(PracticeQuestion).count()
    total_coding_problems = db.query(CodingProblem).count()

    return AdminStats(
        total_users=total_users,
        total_interviews=total_interviews,
        completed_interviews=completed_interviews,
        avg_interview_score=round(float(avg_score), 1),
        total_practice_attempts=total_practice_attempts,
        total_coding_submissions=total_coding_submissions,
        total_practice_questions=total_practice_questions,
        total_coding_problems=total_coding_problems,
    )


# --- User Management ---
@router.get("/users", response_model=List[AdminUserOut])
def get_all_users(
    search: Optional[str] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if search:
        s = f"%{search}%"
        query = query.filter((User.name.ilike(s)) | (User.email.ilike(s)))

    users = query.order_by(User.id.asc()).all()
    results = []

    for u in users:
        prof = db.query(Profile).filter(Profile.user_id == u.id).first()
        interviews_count = db.query(Interview).filter(Interview.user_id == u.id).count()
        coding_count = db.query(CodingSubmission).filter(CodingSubmission.user_id == u.id).count()
        practice_count = db.query(PracticeAttempt).filter(PracticeAttempt.user_id == u.id).count()

        results.append(
            AdminUserOut(
                id=u.id,
                name=u.name,
                email=u.email,
                created_at=u.created_at,
                is_admin=getattr(u, "is_admin", False),
                target_role=prof.target_role if prof else None,
                experience_level=prof.experience_level if prof else None,
                interviews_count=interviews_count,
                coding_submissions_count=coding_count,
                practice_attempts_count=practice_count,
            )
        )

    return results


@router.put("/users/{user_id}/toggle-admin")
def toggle_user_admin(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot revoke your own administrator status.",
        )

    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")

    u.is_admin = not getattr(u, "is_admin", False)
    db.commit()
    return {"message": f"Updated admin status for {u.email} to {u.is_admin}."}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account from the Admin Panel.",
        )

    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")

    db.delete(u)
    db.commit()
    return {"message": f"User {u.email} and all associated records deleted."}


# --- Practice Questions Management ---
@router.get("/practice-questions")
def get_admin_practice_questions(
    category: Optional[str] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(PracticeQuestion)
    if category and category.lower() != "all":
        query = query.filter(PracticeQuestion.category.ilike(category))

    questions = query.order_by(PracticeQuestion.id.desc()).all()
    results = []
    for q in questions:
        attempts_count = db.query(PracticeAttempt).filter(PracticeAttempt.question_id == q.id).count()
        results.append({
            "id": q.id,
            "category": q.category,
            "difficulty": q.difficulty,
            "title": q.title,
            "question_text": q.question_text,
            "explanation": q.explanation,
            "sample_answer": q.sample_answer,
            "tags": q.tags or [],
            "options": q.options,
            "correct_option": q.correct_option,
            "attempts_count": attempts_count,
        })
    return results


@router.post("/practice-questions", status_code=status.HTTP_201_CREATED)
def create_practice_question(
    item_in: PracticeQuestionCreateOrUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = PracticeQuestion(
        category=item_in.category,
        difficulty=item_in.difficulty,
        title=item_in.title,
        question_text=item_in.question_text,
        explanation=item_in.explanation,
        sample_answer=item_in.sample_answer,
        tags=item_in.tags or [],
        options=item_in.options,
        correct_option=item_in.correct_option,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.put("/practice-questions/{question_id}")
def update_practice_question(
    question_id: int,
    item_in: PracticeQuestionCreateOrUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(PracticeQuestion).filter(PracticeQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    q.category = item_in.category
    q.difficulty = item_in.difficulty
    q.title = item_in.title
    q.question_text = item_in.question_text
    q.explanation = item_in.explanation
    q.sample_answer = item_in.sample_answer
    q.tags = item_in.tags or []
    q.options = item_in.options
    q.correct_option = item_in.correct_option

    db.commit()
    db.refresh(q)
    return q


@router.delete("/practice-questions/{question_id}")
def delete_practice_question(
    question_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(PracticeQuestion).filter(PracticeQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")
    db.delete(q)
    db.commit()
    return {"message": "Question deleted successfully."}


# --- Coding Problems Management ---
@router.get("/coding-problems")
def get_admin_coding_problems(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    problems = db.query(CodingProblem).order_by(CodingProblem.id.desc()).all()
    results = []
    for p in problems:
        sub_count = db.query(CodingSubmission).filter(CodingSubmission.problem_id == p.id).count()
        accepted_count = (
            db.query(CodingSubmission)
            .filter(CodingSubmission.problem_id == p.id, CodingSubmission.status == "Accepted")
            .count()
        )
        results.append({
            "id": p.id,
            "title": p.title,
            "slug": p.slug,
            "difficulty": p.difficulty,
            "category": p.category,
            "description": p.description,
            "constraints": p.constraints,
            "examples": p.examples or [],
            "starter_templates": p.starter_templates or {},
            "test_cases": p.test_cases or [],
            "submissions_count": sub_count,
            "accepted_count": accepted_count,
        })
    return results


@router.post("/coding-problems", status_code=status.HTTP_201_CREATED)
def create_coding_problem(
    item_in: CodingProblemCreateOrUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Check if slug exists
    existing = db.query(CodingProblem).filter(CodingProblem.slug == item_in.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="A problem with this slug already exists.")

    prob = CodingProblem(
        title=item_in.title,
        slug=item_in.slug,
        difficulty=item_in.difficulty,
        category=item_in.category,
        description=item_in.description,
        constraints=item_in.constraints,
        examples=item_in.examples or [],
        starter_templates=item_in.starter_templates or {},
        test_cases=item_in.test_cases or [],
    )
    db.add(prob)
    db.commit()
    db.refresh(prob)
    return prob


@router.put("/coding-problems/{problem_id}")
def update_coding_problem(
    problem_id: int,
    item_in: CodingProblemCreateOrUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    prob = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not prob:
        raise HTTPException(status_code=404, detail="Problem not found.")

    prob.title = item_in.title
    prob.slug = item_in.slug
    prob.difficulty = item_in.difficulty
    prob.category = item_in.category
    prob.description = item_in.description
    prob.constraints = item_in.constraints
    prob.examples = item_in.examples or []
    prob.starter_templates = item_in.starter_templates or {}
    prob.test_cases = item_in.test_cases or []

    db.commit()
    db.refresh(prob)
    return prob


@router.delete("/coding-problems/{problem_id}")
def delete_coding_problem(
    problem_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    prob = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not prob:
        raise HTTPException(status_code=404, detail="Problem not found.")
    db.delete(prob)
    db.commit()
    return {"message": "Coding problem deleted successfully."}


# --- Candidate Interviews & Reports Monitor ---
@router.get("/interviews")
def get_admin_interviews(
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    interviews = (
        db.query(Interview)
        .order_by(Interview.created_at.desc())
        .limit(limit)
        .all()
    )
    results = []
    for it in interviews:
        u = db.query(User).filter(User.id == it.user_id).first()
        rep = db.query(Report).filter(Report.interview_id == it.id).first()

        results.append({
            "id": it.id,
            "candidate_name": u.name if u else "Unknown",
            "candidate_email": u.email if u else "Unknown",
            "target_role": it.target_role,
            "interview_type": it.interview_type,
            "difficulty": it.current_difficulty,
            "status": it.status,
            "overall_score": it.overall_score,
            "technical_score": rep.technical_score if rep else None,
            "communication_score": rep.communication_score if rep else None,
            "started_at": it.started_at,
            "completed_at": it.completed_at,
            "has_report": rep is not None,
            "report_id": rep.id if rep else None,
        })
    return results
