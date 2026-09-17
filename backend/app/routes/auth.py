import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Profile, OTPVerification
from ..schemas import (
    UserRegister,
    UserLogin,
    Token,
    UserResponse,
    PasswordChangeRequest,
    VerifyOTPRequest,
    ForgotPasswordRequest,
    ResetPasswordWithOTPRequest,
    ResendOTPRequest,
    OTPResponse,
)
from ..auth import get_password_hash, verify_password, create_access_token
from ..dependencies import get_current_user
from ..services.email_service import send_otp_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    """Direct registration (retained for backward compatibility and tests)"""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    hashed = get_password_hash(user_in.password)
    user = User(
        name=user_in.name,
        email=user_in.email,
        hashed_password=hashed
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = Profile(
        user_id=user.id,
        target_role="Full Stack Developer",
        experience_level="Entry-level",
        skills=["Python", "React", "SQL", "FastAPI"],
        projects=[]
    )
    db.add(profile)
    db.commit()

    token_str = create_access_token(data={"sub": user.email, "user_id": user.id})
    return Token(
        access_token=token_str,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

# --- OTP-based Sign Up Flow ---
@router.post("/register/request-otp", response_model=OTPResponse)
def request_register_otp(user_in: UserRegister, db: Session = Depends(get_db)):
    """Validates registration info and sends 6-digit OTP via EmailJS"""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in."
        )

    otp = f"{random.randint(100000, 999999)}"
    hashed = get_password_hash(user_in.password)

    # Clean old pending register OTPs for this email
    db.query(OTPVerification).filter(
        OTPVerification.email == user_in.email,
        OTPVerification.otp_type == "register"
    ).delete()

    otp_record = OTPVerification(
        email=user_in.email,
        otp=otp,
        otp_type="register",
        payload={"name": user_in.name, "hashed_password": hashed},
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(otp_record)
    db.commit()

    email_res = send_otp_email(user_in.email, user_in.name, otp, purpose="Account Verification")
    dev_mode = email_res.get("dev_mode", False)

    return OTPResponse(
        message="Verification code sent to your email.",
        email=user_in.email,
        dev_mode=dev_mode,
        dev_otp=otp if dev_mode else None
    )

@router.post("/register/verify-otp", response_model=Token, status_code=status.HTTP_201_CREATED)
def verify_register_otp(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verifies OTP and activates user account in PostgreSQL"""
    record = db.query(OTPVerification).filter(
        OTPVerification.email == req.email,
        OTPVerification.otp_type == "register",
        OTPVerification.otp == req.otp
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or incorrect verification code."
        )

    if datetime.utcnow() > record.expires_at:
        db.delete(record)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )

    payload = record.payload or {}
    name = payload.get("name", "New User")
    hashed_password = payload.get("hashed_password")

    if not hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration session expired. Please fill the signup form again."
        )

    user = User(
        name=name,
        email=req.email,
        hashed_password=hashed_password
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = Profile(
        user_id=user.id,
        target_role="Full Stack Developer",
        experience_level="Entry-level",
        skills=["Python", "React", "SQL", "FastAPI"],
        projects=[]
    )
    db.add(profile)
    db.delete(record)
    db.commit()

    token_str = create_access_token(data={"sub": user.email, "user_id": user.id})
    return Token(
        access_token=token_str,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

# --- Forgot Password Flow ---
@router.post("/forgot-password/request-otp", response_model=OTPResponse)
def request_forgot_password_otp(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generates and sends a 6-digit OTP for password reset"""
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )

    otp = f"{random.randint(100000, 999999)}"

    # Remove any existing forgot-password OTP for this email
    db.query(OTPVerification).filter(
        OTPVerification.email == req.email,
        OTPVerification.otp_type == "forgot_password"
    ).delete()

    record = OTPVerification(
        email=req.email,
        otp=otp,
        otp_type="forgot_password",
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(record)
    db.commit()

    email_res = send_otp_email(user.email, user.name, otp, purpose="Password Reset")
    dev_mode = email_res.get("dev_mode", False)

    return OTPResponse(
        message="Password reset code sent to your email.",
        email=user.email,
        dev_mode=dev_mode,
        dev_otp=otp if dev_mode else None
    )

@router.post("/forgot-password/reset")
def reset_password_with_otp(req: ResetPasswordWithOTPRequest, db: Session = Depends(get_db)):
    """Verifies OTP and resets the user password in PostgreSQL"""
    record = db.query(OTPVerification).filter(
        OTPVerification.email == req.email,
        OTPVerification.otp_type == "forgot_password",
        OTPVerification.otp == req.otp
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or incorrect reset code."
        )

    if datetime.utcnow() > record.expires_at:
        db.delete(record)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new one."
        )

    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    user.hashed_password = get_password_hash(req.new_password)
    db.delete(record)
    db.commit()

    return {"message": "Your password has been successfully reset. Please log in with your new password."}

@router.post("/resend-otp", response_model=OTPResponse)
def resend_otp(req: ResendOTPRequest, db: Session = Depends(get_db)):
    """Resends a fresh OTP code"""
    record = db.query(OTPVerification).filter(
        OTPVerification.email == req.email,
        OTPVerification.otp_type == req.otp_type
    ).first()

    name = "User"
    if req.otp_type == "register":
        if not record or not record.payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pending registration found for this email."
            )
        name = record.payload.get("name", "User")
        saved_payload = record.payload
    else:
        user = db.query(User).filter(User.email == req.email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email."
            )
        name = user.name
        saved_payload = None

    otp = f"{random.randint(100000, 999999)}"
    if record:
        db.delete(record)

    new_record = OTPVerification(
        email=req.email,
        otp=otp,
        otp_type=req.otp_type,
        payload=saved_payload,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(new_record)
    db.commit()

    purpose = "Account Verification" if req.otp_type == "register" else "Password Reset"
    email_res = send_otp_email(req.email, name, otp, purpose=purpose)
    dev_mode = email_res.get("dev_mode", False)

    return OTPResponse(
        message="A new verification code has been sent to your email.",
        email=req.email,
        dev_mode=dev_mode,
        dev_otp=otp if dev_mode else None
    )

# --- Standard Auth Endpoints ---
@router.post("/login", response_model=Token)
def login_user(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email).first()
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token_str = create_access_token(data={"sub": user.email, "user_id": user.id})
    return Token(
        access_token=token_str,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user)):
    return user

@router.post("/change-password")
def change_password(
    req: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(req.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )
    user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password updated successfully."}

@router.delete("/delete-account")
def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.delete(user)
    db.commit()
    return {"message": "Account successfully deleted."}
