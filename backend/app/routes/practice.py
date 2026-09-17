from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import User, PracticeQuestion, PracticeAttempt
from ..schemas import (
    PracticeQuestionResponse,
    PracticeAttemptCreate,
    PracticeAttemptResponse,
)
from ..dependencies import get_current_user
from ..services.gemini import evaluate_answer

router = APIRouter(prefix="/api/practice", tags=["Practice Module"])

@router.get("/questions", response_model=List[PracticeQuestionResponse])
def get_practice_questions(
    category: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    bookmarked_only: bool = Query(False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(PracticeQuestion)

    if category and category.lower() != "all":
        query = query.filter(PracticeQuestion.category.ilike(category))
    if difficulty and difficulty.lower() != "all":
        query = query.filter(PracticeQuestion.difficulty.ilike(difficulty))
    if search:
        s = f"%{search}%"
        query = query.filter(
            (PracticeQuestion.title.ilike(s)) | (PracticeQuestion.question_text.ilike(s))
        )

    questions = query.all()

    # Fetch user's attempts and bookmarks
    user_attempts = (
        db.query(PracticeAttempt)
        .filter(PracticeAttempt.user_id == user.id)
        .all()
    )
    bookmark_map = {}
    score_map = {}
    attempt_count_map = {}

    for att in user_attempts:
        qid = att.question_id
        attempt_count_map[qid] = attempt_count_map.get(qid, 0) + 1
        if att.bookmarked:
            bookmark_map[qid] = True
        if qid not in score_map or att.score > score_map[qid]:
            score_map[qid] = att.score

    results = []
    for q in questions:
        is_bookmarked = bookmark_map.get(q.id, False)
        if bookmarked_only and not is_bookmarked:
            continue

        results.append(
            PracticeQuestionResponse(
                id=q.id,
                category=q.category,
                difficulty=q.difficulty,
                title=q.title,
                question_text=q.question_text,
                options=q.options,
                explanation=q.explanation,
                sample_answer=q.sample_answer,
                tags=q.tags or [],
                is_bookmarked=is_bookmarked,
                last_score=score_map.get(q.id),
                attempt_count=attempt_count_map.get(q.id, 0),
            )
        )

    return results

@router.get("/questions/{question_id}", response_model=PracticeQuestionResponse)
def get_practice_question(
    question_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(PracticeQuestion).filter(PracticeQuestion.id == question_id).first()
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found."
        )

    last_attempt = (
        db.query(PracticeAttempt)
        .filter(PracticeAttempt.question_id == q.id, PracticeAttempt.user_id == user.id)
        .order_by(PracticeAttempt.created_at.desc())
        .first()
    )

    is_bookmarked = False
    if last_attempt and last_attempt.bookmarked:
        is_bookmarked = True

    return PracticeQuestionResponse(
        id=q.id,
        category=q.category,
        difficulty=q.difficulty,
        title=q.title,
        question_text=q.question_text,
        options=q.options,
        explanation=q.explanation,
        sample_answer=q.sample_answer,
        tags=q.tags or [],
        is_bookmarked=is_bookmarked,
        last_score=last_attempt.score if last_attempt else None,
        attempt_count=db.query(PracticeAttempt).filter(PracticeAttempt.question_id == q.id, PracticeAttempt.user_id == user.id).count(),
    )

@router.post("/questions/{question_id}/attempt", response_model=PracticeAttemptResponse)
def attempt_practice_question(
    question_id: int,
    attempt_in: PracticeAttemptCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(PracticeQuestion).filter(PracticeQuestion.id == question_id).first()
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found."
        )

    # Evaluate answer with Gemini AI + Reference ground truth
    eval_res = evaluate_answer(
        question_text=q.question_text,
        category=q.category,
        difficulty=q.difficulty,
        user_answer=attempt_in.user_answer,
        sample_answer=q.sample_answer or "",
        explanation=q.explanation or "",
    )

    score = float(eval_res.get("score", 7.0))
    is_correct = score >= 6.5

    feedback_parts = []
    strengths = eval_res.get("strengths", [])
    if strengths:
        if isinstance(strengths, list):
            feedback_parts.append("✓ Strengths:\n• " + "\n• ".join(strengths))
        else:
            feedback_parts.append(f"✓ Strengths:\n• {strengths}")

    weaknesses = eval_res.get("weaknesses", [])
    if weaknesses:
        if isinstance(weaknesses, list):
            feedback_parts.append("▲ Areas to Improve:\n• " + "\n• ".join(weaknesses))
        else:
            feedback_parts.append(f"▲ Areas to Improve:\n• {weaknesses}")

    suggestion = eval_res.get("improvement_suggestion")
    if suggestion:
        feedback_parts.append(f"💡 Actionable Tip:\n{suggestion}")

    feedback = "\n\n".join(feedback_parts) if feedback_parts else f"Score: {score}/10."

    attempt = PracticeAttempt(
        user_id=user.id,
        question_id=q.id,
        user_answer=attempt_in.user_answer,
        is_correct=is_correct,
        score=score,
        feedback=feedback,
        bookmarked=False,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return attempt

@router.post("/questions/{question_id}/bookmark")
def toggle_bookmark(
    question_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(PracticeQuestion).filter(PracticeQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    attempt = (
        db.query(PracticeAttempt)
        .filter(PracticeAttempt.question_id == q.id, PracticeAttempt.user_id == user.id)
        .order_by(PracticeAttempt.created_at.desc())
        .first()
    )

    if not attempt:
        # Create dummy record to store bookmark
        attempt = PracticeAttempt(
            user_id=user.id,
            question_id=q.id,
            user_answer="(Bookmarked without submission)",
            is_correct=False,
            score=0.0,
            bookmarked=True,
        )
        db.add(attempt)
        db.commit()
        return {"bookmarked": True}
    else:
        attempt.bookmarked = not attempt.bookmarked
        db.commit()
        return {"bookmarked": attempt.bookmarked}

@router.get("/history", response_model=List[PracticeAttemptResponse])
def get_practice_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attempts = (
        db.query(PracticeAttempt)
        .filter(PracticeAttempt.user_id == user.id)
        .order_by(PracticeAttempt.created_at.desc())
        .limit(50)
        .all()
    )
    return attempts
