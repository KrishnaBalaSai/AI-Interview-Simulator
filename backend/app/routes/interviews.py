from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import (
    User,
    Profile,
    Resume,
    Interview,
    InterviewQuestion,
    InterviewResponse,
    AIEvaluation,
    InterviewEvent,
    Report,
)
from ..schemas import (
    InterviewCreate,
    InterviewDetail,
    InterviewQuestionOut,
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    AIEvaluationResult,
    InterviewEventOut,
    HeartbeatResponse,
    AutoSubmitRequest,
)
from ..dependencies import get_current_user
from ..services.gemini import (
    generate_interview_question,
    evaluate_answer,
    generate_interview_summary,
)

router = APIRouter(prefix="/api/interviews", tags=["AI Mock Interviews"])

DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"]

def _adjust_difficulty(current_diff: str, score: float) -> tuple[str, str]:
    """
    Adaptive Difficulty Logic:
    Score >= 8: Increase difficulty
    Score 5–7: Keep difficulty
    Score < 5: Decrease difficulty
    """
    idx = DIFFICULTY_LEVELS.index(current_diff) if current_diff in DIFFICULTY_LEVELS else 1
    if score >= 8.0:
        new_idx = min(len(DIFFICULTY_LEVELS) - 1, idx + 1)
        change = "increased" if new_idx > idx else "maintained"
    elif score < 5.0:
        new_idx = max(0, idx - 1)
        change = "decreased" if new_idx < idx else "maintained"
    else:
        new_idx = idx
        change = "maintained"

    return DIFFICULTY_LEVELS[new_idx], change


@router.post("", response_model=InterviewDetail)
def start_mock_interview(
    config: InterviewCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    skills = profile.skills if profile else ["Python", "SQL", "React"]

    resume_context = ""
    all_projects = []
    if config.use_resume:
        resume = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.created_at.desc()).first()
        if resume:
            skills_list = resume.extracted_skills or []
            proj_list = resume.projects or []
            all_projects.extend(proj_list)
            proj_names = []
            for p in proj_list:
                if isinstance(p, dict) and "title" in p:
                    proj_names.append(p["title"])
                elif isinstance(p, str):
                    proj_names.append(p)
            proj_str = f". Projects: {', '.join(proj_names[:3])}" if proj_names else ""
            resume_context = f"Skills: {', '.join(skills_list[:6])}{proj_str}"

    if not all_projects and profile and profile.projects:
        all_projects.extend(profile.projects)

    # Create interview session
    interview = Interview(
        user_id=user.id,
        interview_type=config.interview_type,
        target_role=config.target_role,
        initial_difficulty=config.difficulty,
        current_difficulty=config.difficulty,
        total_questions=config.total_questions,
        status="in_progress",
        overall_score=0.0,
        started_at=datetime.utcnow(),
        last_activity_at=datetime.utcnow(),
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    # Generate Question #1
    q_data = generate_interview_question(
        role=config.target_role,
        difficulty=config.difficulty,
        interview_type=config.interview_type,
        question_number=1,
        total_questions=config.total_questions,
        skills=skills,
        resume_context=resume_context,
        projects=all_projects,
        previous_qa=[],
    )

    first_q = InterviewQuestion(
        interview_id=interview.id,
        question_order=1,
        category=q_data.get("category", "General Technical"),
        difficulty=q_data.get("difficulty", config.difficulty),
        question_text=q_data.get("question_text", "Tell me about your technical background and key projects."),
        expected_points=q_data.get("expected_points", []),
    )
    db.add(first_q)
    db.commit()
    db.refresh(first_q)

    return InterviewDetail(
        id=interview.id,
        interview_type=interview.interview_type,
        target_role=interview.target_role,
        initial_difficulty=interview.initial_difficulty,
        current_difficulty=interview.current_difficulty,
        total_questions=interview.total_questions,
        status=interview.status,
        overall_score=interview.overall_score,
        started_at=interview.started_at,
        last_activity_at=interview.last_activity_at,
        auto_submit_reason=interview.auto_submit_reason,
        created_at=interview.created_at,
        questions=[InterviewQuestionOut.model_validate(first_q)],
        current_question=InterviewQuestionOut.model_validate(first_q),
    )


@router.get("", response_model=List[InterviewDetail])
def list_interviews(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interviews = (
        db.query(Interview)
        .filter(Interview.user_id == user.id)
        .order_by(Interview.created_at.desc())
        .all()
    )
    results = []
    for it in interviews:
        results.append(
            InterviewDetail(
                id=it.id,
                interview_type=it.interview_type,
                target_role=it.target_role,
                initial_difficulty=it.initial_difficulty,
                current_difficulty=it.current_difficulty,
                total_questions=it.total_questions,
                status=it.status,
                overall_score=it.overall_score,
                started_at=it.started_at,
                last_activity_at=it.last_activity_at,
                auto_submit_reason=it.auto_submit_reason,
                created_at=it.created_at,
                completed_at=it.completed_at,
                questions=[InterviewQuestionOut.model_validate(q) for q in it.questions],
            )
        )
    return results


@router.get("/{interview_id}", response_model=InterviewDetail)
def get_interview(
    interview_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    # Determine current unanswered question
    current_q = None
    if interview.status == "in_progress":
        for q in interview.questions:
            if not q.response:
                current_q = InterviewQuestionOut.model_validate(q)
                break

    return InterviewDetail(
        id=interview.id,
        interview_type=interview.interview_type,
        target_role=interview.target_role,
        initial_difficulty=interview.initial_difficulty,
        current_difficulty=interview.current_difficulty,
        total_questions=interview.total_questions,
        status=interview.status,
        overall_score=interview.overall_score,
        started_at=interview.started_at,
        last_activity_at=interview.last_activity_at,
        auto_submit_reason=interview.auto_submit_reason,
        created_at=interview.created_at,
        completed_at=interview.completed_at,
        questions=[InterviewQuestionOut.model_validate(q) for q in interview.questions],
        current_question=current_q,
    )


@router.post("/{interview_id}/answer", response_model=InterviewAnswerResponse)
def answer_interview_question(
    interview_id: int,
    answer_in: InterviewAnswerRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == user.id)
        .first()
    )
    if not interview or interview.status != "in_progress":
        raise HTTPException(status_code=400, detail="Interview is not active or not found.")

    # Find the current pending question directly from DB to avoid session collection caching
    current_q = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_id == interview.id)
        .outerjoin(InterviewResponse, InterviewQuestion.id == InterviewResponse.question_id)
        .filter(InterviewResponse.id == None)
        .order_by(InterviewQuestion.question_order.asc())
        .first()
    )

    if not current_q:
        raise HTTPException(status_code=400, detail="No pending question found in this interview.")

    # Evaluate Answer with Gemini Service + Communication Analysis
    eval_data = evaluate_answer(
        question_text=current_q.question_text,
        category=current_q.category,
        difficulty=current_q.difficulty,
        user_answer=answer_in.answer,
        role=interview.target_role,
        duration_seconds=answer_in.duration_seconds,
    )

    # Store InterviewResponse
    response_rec = InterviewResponse(
        interview_id=interview.id,
        question_id=current_q.id,
        user_answer=answer_in.answer,
        duration_seconds=answer_in.duration_seconds,
    )
    db.add(response_rec)
    db.commit()
    db.refresh(response_rec)

    # Store AIEvaluation
    ai_eval = AIEvaluation(
        response_id=response_rec.id,
        score=eval_data["score"],
        technical_correctness=eval_data["technical_correctness"],
        relevance=eval_data["relevance"],
        completeness=eval_data["completeness"],
        strengths=eval_data["strengths"],
        weaknesses=eval_data["weaknesses"],
        better_answer=eval_data["better_answer"],
        improvement_suggestion=eval_data["improvement_suggestion"],
        filler_words_count=eval_data["filler_words_count"],
        communication_score=eval_data["communication_score"],
        communication_feedback=eval_data["communication_feedback"],
    )
    db.add(ai_eval)

    # Compute timeline timestamp string (e.g. "01:25", "03:10")
    total_seconds_elapsed = sum([r.duration_seconds for r in interview.responses]) + answer_in.duration_seconds
    mins = total_seconds_elapsed // 60
    secs = total_seconds_elapsed % 60
    timestamp_str = f"{mins:02d}:{secs:02d}"

    # Generate Mistake Timeline Event
    mistake_sum = eval_data["weaknesses"][0] if eval_data["weaknesses"] else "Minor terminology gaps"
    missing = eval_data.get("weaknesses", [])
    event = InterviewEvent(
        interview_id=interview.id,
        question_id=current_q.id,
        timestamp_str=timestamp_str,
        topic=current_q.category,
        score=eval_data["score"],
        mistake_summary=mistake_sum,
        missing_concepts=missing,
        better_answer=eval_data.get("better_answer"),
        improvement_tip=eval_data.get("improvement_suggestion"),
    )
    db.add(event)

    # Adaptive Difficulty Update
    interview.last_activity_at = datetime.utcnow()
    prev_difficulty = interview.current_difficulty
    new_difficulty, change_type = _adjust_difficulty(prev_difficulty, eval_data["score"])
    interview.current_difficulty = new_difficulty

    # Check if more questions are needed
    answered_count = (
        db.query(InterviewResponse)
        .filter(InterviewResponse.interview_id == interview.id)
        .count()
    )
    next_q_out = None
    is_completed = False

    if answered_count < interview.total_questions:
        # Generate next question with adaptive difficulty, project awareness & conversational context
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        skills = profile.skills if profile else ["Python", "SQL"]

        all_projects = []
        resume_context = ""
        resume = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.created_at.desc()).first()
        if resume:
            skills_list = resume.extracted_skills or []
            proj_list = resume.projects or []
            all_projects.extend(proj_list)
            proj_names = []
            for p in proj_list:
                if isinstance(p, dict) and "title" in p:
                    proj_names.append(p["title"])
                elif isinstance(p, str):
                    proj_names.append(p)
            proj_str = f". Projects: {', '.join(proj_names[:3])}" if proj_names else ""
            resume_context = f"Skills: {', '.join(skills_list[:6])}{proj_str}"

        if not all_projects and profile and profile.projects:
            all_projects.extend(profile.projects)

        past_qa = []
        for q in db.query(InterviewQuestion).filter(InterviewQuestion.interview_id == interview.id).order_by(InterviewQuestion.question_order.asc()).all():
            if q.response:
                ev = q.response.evaluation
                past_qa.append({
                    "question": q.question_text,
                    "answer": q.response.user_answer,
                    "score": ev.score if ev else 7.0,
                    "weaknesses": ev.weaknesses if ev else [],
                })

        next_q_data = generate_interview_question(
            role=interview.target_role,
            difficulty=new_difficulty,
            interview_type=interview.interview_type,
            question_number=answered_count + 1,
            total_questions=interview.total_questions,
            skills=skills,
            resume_context=resume_context,
            projects=all_projects,
            previous_qa=past_qa,
        )

        next_q = InterviewQuestion(
            interview_id=interview.id,
            question_order=answered_count + 1,
            category=next_q_data.get("category", "Technical"),
            difficulty=new_difficulty,
            question_text=next_q_data.get("question_text"),
            expected_points=next_q_data.get("expected_points", []),
        )
        db.add(next_q)
        db.commit()
        db.refresh(next_q)
        next_q_out = InterviewQuestionOut.model_validate(next_q)
    else:
        # Complete Interview
        is_completed = True
        interview.status = "completed"
        interview.completed_at = datetime.utcnow()

        # Compute summary & create report directly from responses
        all_evals = []
        all_resps = db.query(InterviewResponse).filter(InterviewResponse.interview_id == interview.id).all()
        for resp in all_resps:
            if resp.evaluation:
                ev = resp.evaluation
                cat = resp.question.category if resp.question else "General"
                all_evals.append({
                    "category": cat,
                    "score": ev.score,
                    "technical_correctness": ev.technical_correctness,
                    "relevance": ev.relevance,
                    "completeness": ev.completeness,
                    "communication_score": ev.communication_score,
                    "strengths": ev.strengths or [],
                    "weaknesses": ev.weaknesses or [],
                })

        summary = generate_interview_summary(interview.target_role, all_evals)
        interview.overall_score = summary["overall_score"]

        report = Report(
            interview_id=interview.id,
            user_id=user.id,
            overall_score=summary["overall_score"],
            technical_score=summary["technical_score"],
            communication_score=summary["communication_score"],
            relevance_score=summary["relevance_score"],
            completeness_score=summary["completeness_score"],
            strengths=summary["strengths"],
            weaknesses=summary["weaknesses"],
            mistakes=summary["mistakes"],
            ai_summary=summary["ai_summary"],
            recommended_topics=summary["recommended_topics"],
        )
        db.add(report)

    db.commit()

    eval_out = AIEvaluationResult(
        score=eval_data["score"],
        technical_correctness=eval_data["technical_correctness"],
        relevance=eval_data["relevance"],
        completeness=eval_data["completeness"],
        strengths=eval_data["strengths"],
        weaknesses=eval_data["weaknesses"],
        better_answer=eval_data.get("better_answer", ""),
        improvement_suggestion=eval_data.get("improvement_suggestion", ""),
        filler_words_count=eval_data["filler_words_count"],
        communication_score=eval_data["communication_score"],
        communication_feedback=eval_data["communication_feedback"],
    )

    return InterviewAnswerResponse(
        previous_difficulty=prev_difficulty,
        updated_difficulty=new_difficulty,
        difficulty_change=change_type,
        is_completed=is_completed,
        question_order=current_q.question_order,
        total_questions=interview.total_questions,
        evaluation=eval_out if is_completed else None,
        next_question=next_q_out,
    )


@router.post("/{interview_id}/complete")
def complete_interview_manually(
    interview_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    if interview.status != "completed":
        interview.status = "completed"
        interview.completed_at = datetime.utcnow()

        all_evals = []
        for q in interview.questions:
            if q.response and q.response.evaluation:
                ev = q.response.evaluation
                all_evals.append({
                    "category": q.category,
                    "score": ev.score,
                    "technical_correctness": ev.technical_correctness,
                    "relevance": ev.relevance,
                    "completeness": ev.completeness,
                    "communication_score": ev.communication_score,
                    "strengths": ev.strengths or [],
                    "weaknesses": ev.weaknesses or [],
                })

        summary = generate_interview_summary(interview.target_role, all_evals)
        interview.overall_score = summary["overall_score"]

        # Check if report exists
        existing_report = db.query(Report).filter(Report.interview_id == interview.id).first()
        if not existing_report:
            report = Report(
                interview_id=interview.id,
                user_id=user.id,
                overall_score=summary["overall_score"],
                technical_score=summary["technical_score"],
                communication_score=summary["communication_score"],
                relevance_score=summary["relevance_score"],
                completeness_score=summary["completeness_score"],
                strengths=summary["strengths"],
                weaknesses=summary["weaknesses"],
                mistakes=summary["mistakes"],
                ai_summary=summary["ai_summary"],
                recommended_topics=summary["recommended_topics"],
            )
            db.add(report)

        db.commit()

    return {"message": "Interview completed successfully."}


@router.get("/{interview_id}/mistakes", response_model=List[InterviewEventOut])
def get_mistake_timeline(
    interview_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    UNIQUE FEATURE: Interview Mistake Timeline
    Returns interactive timeline events with question, answer, mistakes, and model improvements.
    """
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    events = (
        db.query(InterviewEvent)
        .filter(InterviewEvent.interview_id == interview.id)
        .order_by(InterviewEvent.id.asc())
        .all()
    )

    results = []
    for ev in events:
        q_text = ev.question.question_text if ev.question else ""
        u_ans = ev.question.response.user_answer if ev.question and ev.question.response else ""
        results.append(
            InterviewEventOut(
                id=ev.id,
                question_id=ev.question_id,
                timestamp_str=ev.timestamp_str,
                topic=ev.topic,
                score=ev.score,
                mistake_summary=ev.mistake_summary,
                missing_concepts=ev.missing_concepts or [],
                better_answer=ev.better_answer,
                improvement_tip=ev.improvement_tip,
                question_text=q_text,
                user_answer=u_ans,
            )
        )
    return results


@router.post("/{interview_id}/heartbeat", response_model=HeartbeatResponse)
def interview_heartbeat(
    interview_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    now = datetime.utcnow()
    if interview.status == "in_progress":
        interview.last_activity_at = now
        db.commit()

    return HeartbeatResponse(
        status=interview.status,
        last_activity_at=interview.last_activity_at or now,
        is_active=(interview.status == "in_progress"),
    )


@router.post("/{interview_id}/auto-submit")
def auto_submit_interview(
    interview_id: int,
    payload: Optional[AutoSubmitRequest] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    existing_report = db.query(Report).filter(Report.interview_id == interview.id).first()
    if interview.status in ["completed", "auto_submitted"] and existing_report:
        return {
            "message": "Interview is already finished.",
            "status": interview.status,
            "reason": interview.auto_submit_reason,
        }

    reason = payload.reason if payload and payload.reason else "inactivity_timeout"
    interview.status = "auto_submitted"
    interview.completed_at = datetime.utcnow()
    interview.auto_submit_reason = reason

    # Aggregate completed responses so far
    all_evals = []
    for q in interview.questions:
        if q.response and q.response.evaluation:
            ev = q.response.evaluation
            all_evals.append({
                "category": q.category,
                "score": ev.score,
                "technical_correctness": ev.technical_correctness,
                "relevance": ev.relevance,
                "completeness": ev.completeness,
                "communication_score": ev.communication_score,
                "strengths": ev.strengths or [],
                "weaknesses": ev.weaknesses or [],
            })

    if all_evals:
        try:
            summary = generate_interview_summary(interview.target_role, all_evals)
            interview.overall_score = summary["overall_score"]
        except Exception:
            avg_score = sum(e["score"] for e in all_evals) / len(all_evals)
            summary = {
                "overall_score": round(avg_score, 1),
                "technical_score": round(avg_score, 1),
                "communication_score": 70.0,
                "relevance_score": round(avg_score, 1),
                "completeness_score": round(avg_score, 1),
                "strengths": ["Completed partial interview responses"],
                "weaknesses": ["Interview was terminated early."],
                "mistakes": [],
                "ai_summary": f"Interview auto-submitted due to: {reason}.",
                "recommended_topics": ["Practice Full Sessions"],
            }
            interview.overall_score = round(avg_score, 1)
    else:
        summary = {
            "overall_score": 0.0,
            "technical_score": 0.0,
            "communication_score": 0.0,
            "relevance_score": 0.0,
            "completeness_score": 0.0,
            "strengths": ["Started interview session"],
            "weaknesses": ["Interview was terminated early before answers were submitted."],
            "mistakes": ["Session ended early before answering."],
            "ai_summary": f"Interview auto-submitted due to: {reason}.",
            "recommended_topics": ["Complete full mock interview sessions to receive comprehensive evaluation."],
        }
        interview.overall_score = 0.0

    existing_report = db.query(Report).filter(Report.interview_id == interview.id).first()
    if not existing_report:
        report = Report(
            interview_id=interview.id,
            user_id=user.id,
            overall_score=summary["overall_score"],
            technical_score=summary["technical_score"],
            communication_score=summary["communication_score"],
            relevance_score=summary["relevance_score"],
            completeness_score=summary["completeness_score"],
            strengths=summary["strengths"],
            weaknesses=summary["weaknesses"],
            mistakes=summary["mistakes"],
            ai_summary=summary["ai_summary"],
            recommended_topics=summary["recommended_topics"],
        )
        db.add(report)

    db.commit()
    return {
        "message": "Interview auto-submitted successfully.",
        "status": interview.status,
        "reason": reason,
    }

