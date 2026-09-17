import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_admin = Column(Boolean, default=False, nullable=False)

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    practice_attempts = relationship("PracticeAttempt", back_populates="user", cascade="all, delete-orphan")
    coding_submissions = relationship("CodingSubmission", back_populates="user", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    phone = Column(String(50), nullable=True)
    education = Column(String(200), nullable=True)
    experience_level = Column(String(50), default="Entry-level")
    target_role = Column(String(100), default="Full Stack Developer")
    skills = Column(JSON, default=list)  # List of skill names
    projects = Column(JSON, default=list)  # List of project objects {title, desc, tech}
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="profile")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    score = Column(Integer, default=0)
    extracted_skills = Column(JSON, default=list)
    technologies = Column(JSON, default=list)
    projects = Column(JSON, default=list)
    education = Column(JSON, default=list)
    experience = Column(JSON, default=list)
    strengths = Column(JSON, default=list)
    improvements = Column(JSON, default=list)
    generated_questions = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="resumes")


class PracticeQuestion(Base):
    __tablename__ = "practice_questions"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), index=True, nullable=False)  # Python, Java, JavaScript, React, FastAPI, SQL, DSA, DBMS, HR
    difficulty = Column(String(20), index=True, nullable=False)  # Easy, Medium, Hard
    title = Column(String(255), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)  # Optional list of choices if MCQ
    correct_option = Column(String(100), nullable=True)
    explanation = Column(Text, nullable=False)
    sample_answer = Column(Text, nullable=True)
    tags = Column(JSON, default=list)

    attempts = relationship("PracticeAttempt", back_populates="question", cascade="all, delete-orphan")


class PracticeAttempt(Base):
    __tablename__ = "practice_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("practice_questions.id", ondelete="CASCADE"), nullable=False)
    user_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)
    score = Column(Float, default=0.0)
    feedback = Column(Text, nullable=True)
    bookmarked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="practice_attempts")
    question = relationship("PracticeQuestion", back_populates="attempts")


class CodingProblem(Base):
    __tablename__ = "coding_problems"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    difficulty = Column(String(20), index=True, nullable=False)  # Easy, Medium, Hard
    category = Column(String(50), index=True, nullable=False)  # Topic (Array, Strings, Binary Tree, etc.)
    pattern = Column(String(100), index=True, nullable=True)  # Pattern (Two-Pointer, Sliding Window, etc.)
    strategy = Column(Text, nullable=True)
    identification = Column(Text, nullable=True)
    reference = Column(String(50), nullable=True)  # LC 167, LC 15, etc.
    leetcode_url = Column(String(255), nullable=True)
    gfg_url = Column(String(255), nullable=True)
    youtube_url = Column(String(255), nullable=True)
    companies = Column(JSON, default=list)  # ["Amazon", "Google", "Meta"]
    description = Column(Text, nullable=False)
    constraints = Column(Text, nullable=False)
    examples = Column(JSON, default=list)  # [{input, output, explanation}]
    starter_templates = Column(JSON, default=dict)  # {"python": "...", "javascript": "...", "java": "..."}
    test_cases = Column(JSON, default=list)  # [{input, expected_output, is_hidden}]

    submissions = relationship("CodingSubmission", back_populates="problem", cascade="all, delete-orphan")


class CodingSubmission(Base):
    __tablename__ = "coding_submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    problem_id = Column(Integer, ForeignKey("coding_problems.id", ondelete="CASCADE"), nullable=False)
    language = Column(String(50), nullable=False)
    code = Column(Text, nullable=False)
    status = Column(String(50), nullable=False)  # Accepted, Wrong Answer, Compilation Error, Runtime Error
    runtime_ms = Column(Float, default=0.0)
    memory_kb = Column(Float, default=0.0)
    test_cases_passed = Column(Integer, default=0)
    total_test_cases = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="coding_submissions")
    problem = relationship("CodingProblem", back_populates="submissions")


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    interview_type = Column(String(50), nullable=False)  # Technical, HR, Mixed
    target_role = Column(String(100), nullable=False)
    initial_difficulty = Column(String(20), nullable=False)  # Easy, Medium, Hard
    current_difficulty = Column(String(20), nullable=False)
    total_questions = Column(Integer, default=5)
    status = Column(String(30), default="in_progress")  # in_progress, completed, auto_submitted
    overall_score = Column(Float, default=0.0)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_activity_at = Column(DateTime, default=datetime.datetime.utcnow)
    auto_submit_reason = Column(String(100), nullable=True)  # e.g., "inactivity_timeout", "tab_closed", "user_completed"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="interviews")
    questions = relationship("InterviewQuestion", back_populates="interview", cascade="all, delete-orphan", order_by="InterviewQuestion.question_order")
    responses = relationship("InterviewResponse", back_populates="interview", cascade="all, delete-orphan")
    events = relationship("InterviewEvent", back_populates="interview", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="interview", uselist=False, cascade="all, delete-orphan")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    question_order = Column(Integer, nullable=False)
    category = Column(String(50), nullable=False)
    difficulty = Column(String(20), nullable=False)
    question_text = Column(Text, nullable=False)
    expected_points = Column(JSON, default=list)

    interview = relationship("Interview", back_populates="questions")
    response = relationship("InterviewResponse", back_populates="question", uselist=False, cascade="all, delete-orphan")
    event = relationship("InterviewEvent", back_populates="question", uselist=False, cascade="all, delete-orphan")


class InterviewResponse(Base):
    __tablename__ = "interview_responses"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False)
    user_answer = Column(Text, nullable=False)
    duration_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    interview = relationship("Interview", back_populates="responses")
    question = relationship("InterviewQuestion", back_populates="response")
    evaluation = relationship("AIEvaluation", back_populates="response", uselist=False, cascade="all, delete-orphan")


class AIEvaluation(Base):
    __tablename__ = "ai_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    response_id = Column(Integer, ForeignKey("interview_responses.id", ondelete="CASCADE"), unique=True, nullable=False)
    score = Column(Float, nullable=False)
    technical_correctness = Column(Float, nullable=False)
    relevance = Column(Float, nullable=False)
    completeness = Column(Float, nullable=False)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    better_answer = Column(Text, nullable=True)
    improvement_suggestion = Column(Text, nullable=True)
    filler_words_count = Column(Integer, default=0)
    communication_score = Column(Float, default=0.0)
    communication_feedback = Column(JSON, default=list)

    response = relationship("InterviewResponse", back_populates="evaluation")


class InterviewEvent(Base):
    __tablename__ = "interview_events"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False)
    timestamp_str = Column(String(50), nullable=False)  # e.g., "01:25"
    topic = Column(String(50), nullable=False)
    score = Column(Float, nullable=False)
    mistake_summary = Column(Text, nullable=False)
    missing_concepts = Column(JSON, default=list)
    better_answer = Column(Text, nullable=True)
    improvement_tip = Column(Text, nullable=True)

    interview = relationship("Interview", back_populates="events")
    question = relationship("InterviewQuestion", back_populates="event")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Float, nullable=False)
    technical_score = Column(Float, nullable=False)
    communication_score = Column(Float, nullable=False)
    relevance_score = Column(Float, nullable=False)
    completeness_score = Column(Float, nullable=False)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    mistakes = Column(JSON, default=list)
    ai_summary = Column(Text, nullable=False)
    recommended_topics = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    interview = relationship("Interview", back_populates="report")
    user = relationship("User", back_populates="reports")


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), index=True, nullable=False)
    otp = Column(String(6), nullable=False)
    otp_type = Column(String(30), nullable=False)  # "register", "forgot_password"
    payload = Column(JSON, nullable=True)  # stores pending name, hashed_password for register
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
