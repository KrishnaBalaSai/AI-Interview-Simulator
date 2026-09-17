from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Profile
from ..schemas import ProfileUpdate, ProfileResponse
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/profile", tags=["User Profile"])

@router.get("", response_model=ProfileResponse)
def get_user_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        # Create one if not found
        profile = Profile(
            user_id=user.id,
            target_role="Full Stack Developer",
            experience_level="Entry-level",
            skills=["Python", "React", "SQL"],
            projects=[]
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return ProfileResponse(
        id=profile.id,
        user_id=user.id,
        name=user.name,
        email=user.email,
        phone=profile.phone,
        education=profile.education,
        experience_level=profile.experience_level or "Entry-level",
        target_role=profile.target_role or "Full Stack Developer",
        skills=profile.skills or [],
        projects=profile.projects or [],
        updated_at=profile.updated_at
    )

@router.put("", response_model=ProfileResponse)
def update_user_profile(
    updates: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        profile = Profile(user_id=user.id)
        db.add(profile)

    if updates.name is not None:
        user.name = updates.name.strip()

    if updates.phone is not None:
        profile.phone = updates.phone
    if updates.education is not None:
        profile.education = updates.education
    if updates.experience_level is not None:
        profile.experience_level = updates.experience_level
    if updates.target_role is not None:
        profile.target_role = updates.target_role
    if updates.skills is not None:
        profile.skills = updates.skills
    if updates.projects is not None:
        profile.projects = updates.projects

    db.commit()
    db.refresh(profile)

    return ProfileResponse(
        id=profile.id,
        user_id=user.id,
        name=user.name,
        email=user.email,
        phone=profile.phone,
        education=profile.education,
        experience_level=profile.experience_level,
        target_role=profile.target_role,
        skills=profile.skills,
        projects=profile.projects,
        updated_at=profile.updated_at
    )
