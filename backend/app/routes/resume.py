import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Resume, Profile
from ..schemas import ResumeResponse
from ..dependencies import get_current_user
from ..services.resume import process_resume_file

router = APIRouter(prefix="/api/resume", tags=["Resume Module"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported for resume analysis."
        )

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit."
        )

    # Save to uploads directory
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    saved_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    # Process and analyze using Gemini/parser
    result = process_resume_file(file_bytes)
    analysis = result["analysis"]

    resume = Resume(
        user_id=user.id,
        filename=file.filename,
        file_path=saved_path,
        score=analysis.get("score", 75),
        extracted_skills=analysis.get("extracted_skills", []),
        technologies=analysis.get("technologies", []),
        projects=analysis.get("projects", []),
        education=analysis.get("education", []),
        experience=analysis.get("experience", []),
        strengths=analysis.get("strengths", []),
        improvements=analysis.get("improvements", []),
        generated_questions=analysis.get("generated_questions", []),
    )
    db.add(resume)

    # Update profile skills if profile has few skills
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if profile and (not profile.skills or len(profile.skills) < 3):
        profile.skills = list(set((profile.skills or []) + (analysis.get("extracted_skills", [])[:6])))

    db.commit()
    db.refresh(resume)

    return resume

@router.get("", response_model=ResumeResponse)
def get_latest_resume(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == user.id)
        .order_by(Resume.created_at.desc())
        .first()
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume has been uploaded yet."
        )
    return resume

@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == user.id)
        .first()
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found."
        )

    # Remove file on disk if exists
    if os.path.exists(resume.file_path):
        try:
            os.remove(resume.file_path)
        except Exception:
            pass

    db.delete(resume)
    db.commit()
    return {"message": "Resume deleted successfully."}
