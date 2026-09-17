from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Report, Interview, InterviewEvent
from ..schemas import ReportOut
from ..dependencies import get_current_user
from ..services.pdf_report import generate_pdf_report

router = APIRouter(prefix="/api/reports", tags=["Interview Reports"])

@router.get("/{report_or_interview_id}", response_model=ReportOut)
def get_report(
    report_or_interview_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check by report_id or interview_id
    report = (
        db.query(Report)
        .filter(
            (Report.id == report_or_interview_id) | (Report.interview_id == report_or_interview_id),
            Report.user_id == user.id,
        )
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found for this interview."
        )
    return report

@router.get("/{report_or_interview_id}/pdf")
def download_pdf_report(
    report_or_interview_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = (
        db.query(Report)
        .filter(
            (Report.id == report_or_interview_id) | (Report.interview_id == report_or_interview_id),
            Report.user_id == user.id,
        )
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found."
        )

    interview = db.query(Interview).filter(Interview.id == report.interview_id).first()
    target_role = interview.target_role if interview else "Software Engineer"
    interview_type = interview.interview_type if interview else "Technical"

    # Fetch mistake timeline events
    events = (
        db.query(InterviewEvent)
        .filter(InterviewEvent.interview_id == report.interview_id)
        .order_by(InterviewEvent.id.asc())
        .all()
    )
    timeline_data = [
        {
            "timestamp_str": ev.timestamp_str,
            "topic": ev.topic,
            "score": ev.score,
            "mistake_summary": ev.mistake_summary,
            "improvement_tip": ev.improvement_tip,
        }
        for ev in events
    ]

    report_dict = {
        "overall_score": report.overall_score,
        "technical_score": report.technical_score,
        "communication_score": report.communication_score,
        "relevance_score": report.relevance_score,
        "completeness_score": report.completeness_score,
        "strengths": report.strengths or [],
        "weaknesses": report.weaknesses or [],
        "mistakes": report.mistakes or [],
        "ai_summary": report.ai_summary or "",
        "recommended_topics": report.recommended_topics or [],
        "created_at": report.created_at,
    }

    pdf_bytes = generate_pdf_report(
        candidate_name=user.name,
        target_role=target_role,
        interview_type=interview_type,
        report_data=report_dict,
        timeline_events=timeline_data,
    )

    filename = f"interview_report_{report.interview_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
