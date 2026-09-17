from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, CodingProblem, CodingSubmission
from ..schemas import (
    CodingProblemList,
    CodingProblemDetail,
    CodingPatternGroup,
    CodingRunRequest,
    CodingRunResult,
    CodingSubmitRequest,
    CodingSubmissionResponse,
)
from ..dependencies import get_current_user
from ..services.coding import run_code_snippet, evaluate_submission

router = APIRouter(prefix="/api/coding", tags=["Coding Practice"])

@router.get("/patterns", response_model=List[CodingPatternGroup])
def get_coding_patterns(
    topic: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Returns all patterns grouped with problem counts, strategy, and identification."""
    query = db.query(CodingProblem)
    if topic and topic.lower() != "all":
        query = query.filter(CodingProblem.category.ilike(topic))
    
    problems = query.order_by(CodingProblem.id.asc()).all()
    
    # Group by (category, pattern)
    groups_dict = {}
    for p in problems:
        pattern_name = p.pattern or "General"
        key = (p.category, pattern_name)
        if key not in groups_dict:
            groups_dict[key] = {
                "topic": p.category,
                "pattern_name": pattern_name,
                "strategy": p.strategy,
                "identification": p.identification,
                "problems": [],
            }
        groups_dict[key]["problems"].append(p)
    
    result = []
    for key, data in groups_dict.items():
        result.append(
            CodingPatternGroup(
                topic=data["topic"],
                pattern_name=data["pattern_name"],
                strategy=data["strategy"],
                identification=data["identification"],
                problem_count=len(data["problems"]),
                problems=data["problems"],
            )
        )
    return result

@router.get("/problems", response_model=List[CodingProblemList])
def get_coding_problems(
    difficulty: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    pattern: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(CodingProblem)
    if difficulty and difficulty.lower() != "all":
        query = query.filter(CodingProblem.difficulty.ilike(difficulty))
    if category and category.lower() != "all":
        query = query.filter(CodingProblem.category.ilike(category))
    if pattern and pattern.lower() != "all":
        query = query.filter(CodingProblem.pattern.ilike(pattern))
    if search:
        s = f"%{search}%"
        query = query.filter(
            (CodingProblem.title.ilike(s)) |
            (CodingProblem.category.ilike(s)) |
            (CodingProblem.pattern.ilike(s)) |
            (CodingProblem.reference.ilike(s))
        )

    return query.order_by(CodingProblem.id.asc()).all()

@router.get("/problems/{problem_id}", response_model=CodingProblemDetail)
def get_coding_problem_detail(
    problem_id: int,
    db: Session = Depends(get_db),
):
    prob = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not prob:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coding problem not found."
        )
    return prob

@router.post("/problems/{problem_id}/run", response_model=CodingRunResult)
def run_code(
    problem_id: int,
    req: CodingRunRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prob = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not prob:
        raise HTTPException(status_code=404, detail="Coding problem not found")

    # Use first example input if custom_input is empty
    sample_input = req.custom_input
    if not sample_input and prob.examples and len(prob.examples) > 0:
        sample_input = str(prob.examples[0].get("input", ""))

    res = run_code_snippet(req.code, req.language, sample_input or "")
    return CodingRunResult(
        status=res.get("status", "Accepted"),
        stdout=res.get("stdout"),
        stderr=res.get("stderr"),
        runtime_ms=res.get("runtime_ms", 0.0),
        memory_kb=res.get("memory_kb", 0.0),
        error=res.get("compile_output") or res.get("stderr"),
    )

@router.post("/problems/{problem_id}/submit", response_model=CodingSubmissionResponse)
def submit_code(
    problem_id: int,
    req: CodingSubmitRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prob = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
    if not prob:
        raise HTTPException(status_code=404, detail="Coding problem not found")

    test_cases = prob.test_cases or []
    eval_res = evaluate_submission(req.code, req.language, test_cases)

    sub = CodingSubmission(
        user_id=user.id,
        problem_id=prob.id,
        language=req.language,
        code=req.code,
        status=eval_res["status"],
        runtime_ms=eval_res["runtime_ms"],
        memory_kb=eval_res["memory_kb"],
        test_cases_passed=eval_res["test_cases_passed"],
        total_test_cases=eval_res["total_test_cases"],
        error_message=eval_res["error_message"],
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    return sub

@router.get("/submissions", response_model=List[CodingSubmissionResponse])
def get_my_submissions(
    problem_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(CodingSubmission).filter(CodingSubmission.user_id == user.id)
    if problem_id:
        query = query.filter(CodingSubmission.problem_id == problem_id)
    return query.order_by(CodingSubmission.created_at.desc()).limit(30).all()
