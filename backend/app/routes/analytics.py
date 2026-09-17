from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import (
    User,
    Interview,
    PracticeAttempt,
    PracticeQuestion,
    CodingSubmission,
    InterviewQuestion,
    Report,
)
from ..schemas import AnalyticsOut
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Dashboard"])

@router.get("", response_model=AnalyticsOut)
def get_analytics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Finished interviews (both completed and auto_submitted sessions)
    finished_interviews = (
        db.query(Interview)
        .filter(
            Interview.user_id == user.id,
            Interview.status.in_(["completed", "auto_submitted"]),
        )
        .order_by(Interview.created_at.asc())
        .all()
    )
    interviews_completed = len(finished_interviews)

    # Compute average interview score safely
    scores = []
    for it in finished_interviews:
        sc = it.overall_score
        # Fallback to report overall_score if interview.overall_score is 0 or None
        if (sc is None or sc == 0.0) and it.report and it.report.overall_score:
            sc = it.report.overall_score
        if sc is not None and sc > 0:
            scores.append(sc)

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    # 2. Coding problems solved
    solved_problems_count = (
        db.query(func.count(func.distinct(CodingSubmission.problem_id)))
        .filter(CodingSubmission.user_id == user.id, CodingSubmission.status == "Accepted")
        .scalar()
        or 0
    )

    # 3. Practice questions completed
    practice_completed_count = (
        db.query(func.count(func.distinct(PracticeAttempt.question_id)))
        .filter(PracticeAttempt.user_id == user.id)
        .scalar()
        or 0
    )

    # 4. Score trends for Recharts
    score_trends = []
    for it in finished_interviews[-10:]:
        sc = it.overall_score
        if (sc is None or sc == 0.0) and it.report and it.report.overall_score:
            sc = it.report.overall_score
        score_trends.append({
            "id": it.id,
            "date": it.created_at.strftime("%b %d"),
            "score": round(sc or 0.0, 1),
            "role": it.target_role,
            "type": it.interview_type,
        })

    # 5. Topic performance from Practice & Interview questions
    topic_scores = defaultdict(list)

    # From practice attempts
    practice_attempts = (
        db.query(PracticeAttempt, PracticeQuestion.category)
        .join(PracticeQuestion, PracticeAttempt.question_id == PracticeQuestion.id)
        .filter(PracticeAttempt.user_id == user.id)
        .all()
    )
    for att, cat in practice_attempts:
        if att.score is not None and att.score > 0:
            topic_scores[cat].append(att.score * 10)  # scale to 0-100%

    # From interview questions
    for it in finished_interviews:
        for q in it.questions:
            if q.response and q.response.evaluation:
                ev = q.response.evaluation
                if ev.score is not None and ev.score > 0:
                    topic_scores[q.category].append(ev.score * 10)

    # Default baseline topics if user hasn't attempted yet
    default_topics = ["Python", "SQL", "React", "DSA", "FastAPI", "DBMS", "HR"]
    for dt in default_topics:
        if dt not in topic_scores:
            topic_scores[dt].append(70.0)

    topic_performance = []
    weak_areas = []
    for topic, s_list in topic_scores.items():
        avg_topic = round(sum(s_list) / len(s_list), 1)
        topic_performance.append({
            "topic": topic,
            "score": avg_topic,
            "total_questions": len(s_list),
        })
        if avg_topic < 75.0:
            weak_areas.append(topic)

    # 6. Recommended practice
    recommended_practice = []
    for weak in weak_areas[:3]:
        recommended_practice.append({
            "topic": weak,
            "reason": f"Current proficiency is below 75%. Practice more {weak} questions.",
            "action_url": f"/practice?category={weak}",
        })

    if not recommended_practice:
        recommended_practice.append({
            "topic": "System Design",
            "reason": "Level up your architectural skills for senior roles.",
            "action_url": "/practice?category=DSA",
        })

    # 7. Skill breakdown (Radar Chart)
    reports = (
        db.query(Report)
        .filter(Report.user_id == user.id)
        .order_by(Report.created_at.desc())
        .all()
    )
    valid_reports = [
        r for r in reports
        if (r.overall_score or 0) > 0 or (r.technical_score or 0) > 0
    ]
    eval_reports = valid_reports if valid_reports else reports

    if eval_reports:
        n = len(eval_reports)
        avg_tech = sum(
            min((r.technical_score or 0.0) * 10, 100.0) if (r.technical_score or 0.0) <= 10 else (r.technical_score or 0.0)
            for r in eval_reports
        ) / n
        avg_comm = sum(r.communication_score or 0.0 for r in eval_reports) / n
        avg_rel = sum(
            min((r.relevance_score or 0.0) * 10, 100.0) if (r.relevance_score or 0.0) <= 10 else (r.relevance_score or 0.0)
            for r in eval_reports
        ) / n
        avg_comp = sum(
            min((r.completeness_score or 0.0) * 10, 100.0) if (r.completeness_score or 0.0) <= 10 else (r.completeness_score or 0.0)
            for r in eval_reports
        ) / n
    else:
        avg_tech = 78.0
        avg_comm = 75.0
        avg_rel = 82.0
        avg_comp = 72.0

    skill_breakdown = {
        "Technical": round(avg_tech, 1),
        "Communication": round(avg_comm, 1),
        "Relevance": round(avg_rel, 1),
        "Completeness": round(avg_comp, 1),
    }

    return AnalyticsOut(
        interviews_completed=interviews_completed,
        coding_problems_solved=solved_problems_count,
        avg_interview_score=avg_score,
        practice_completed=practice_completed_count,
        score_trends=score_trends,
        topic_performance=topic_performance,
        weak_areas=weak_areas,
        recommended_practice=recommended_practice,
        skill_breakdown=skill_breakdown,
    )
