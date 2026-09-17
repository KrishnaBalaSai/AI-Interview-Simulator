from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, model_validator


# --- Auth Schemas ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: str

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    is_admin: bool = False

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    email: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordWithOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)
    confirm_password: str

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class ResendOTPRequest(BaseModel):
    email: EmailStr
    otp_type: str = "register"


class OTPResponse(BaseModel):
    message: str
    email: str
    dev_mode: Optional[bool] = False
    dev_otp: Optional[str] = None


# --- Profile Schemas ---
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    education: Optional[str] = None
    experience_level: Optional[str] = None
    target_role: Optional[str] = None
    skills: Optional[List[str]] = None
    projects: Optional[List[Dict[str, Any]]] = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    education: Optional[str] = None
    experience_level: str
    target_role: str
    skills: List[str]
    projects: List[Dict[str, Any]]
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Resume Schemas ---
class ResumeResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    score: int
    extracted_skills: List[str]
    technologies: List[str]
    projects: List[Dict[str, Any]]
    education: List[str]
    experience: List[str]
    strengths: List[str]
    improvements: List[str]
    generated_questions: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Practice Schemas ---
class PracticeQuestionResponse(BaseModel):
    id: int
    category: str
    difficulty: str
    title: str
    question_text: str
    options: Optional[List[str]] = None
    explanation: str
    sample_answer: Optional[str] = None
    tags: List[str] = []
    is_bookmarked: bool = False
    last_score: Optional[float] = None
    attempt_count: int = 0

    class Config:
        from_attributes = True


class PracticeAttemptCreate(BaseModel):
    user_answer: str


class PracticeAttemptResponse(BaseModel):
    id: int
    question_id: int
    user_answer: str
    is_correct: bool
    score: float
    feedback: Optional[str]
    bookmarked: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Coding Schemas ---
class CodingProblemList(BaseModel):
    id: int
    title: str
    slug: str
    difficulty: str
    category: str
    pattern: Optional[str] = None
    reference: Optional[str] = None
    leetcode_url: Optional[str] = None
    gfg_url: Optional[str] = None
    youtube_url: Optional[str] = None
    companies: Optional[List[str]] = []

    class Config:
        from_attributes = True


class CodingProblemDetail(BaseModel):
    id: int
    title: str
    slug: str
    difficulty: str
    category: str
    pattern: Optional[str] = None
    strategy: Optional[str] = None
    identification: Optional[str] = None
    reference: Optional[str] = None
    leetcode_url: Optional[str] = None
    gfg_url: Optional[str] = None
    youtube_url: Optional[str] = None
    companies: Optional[List[str]] = []
    description: str
    constraints: str
    examples: List[Dict[str, Any]]
    starter_templates: Dict[str, str]

    class Config:
        from_attributes = True


class CodingPatternGroup(BaseModel):
    topic: str
    pattern_name: str
    strategy: Optional[str] = None
    identification: Optional[str] = None
    problem_count: int
    problems: List[CodingProblemList] = []


class CodingRunRequest(BaseModel):
    language: str
    code: str
    custom_input: Optional[str] = None


class CodingRunResult(BaseModel):
    status: str
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    runtime_ms: float = 0.0
    memory_kb: float = 0.0
    error: Optional[str] = None


class CodingSubmitRequest(BaseModel):
    language: str
    code: str


class CodingSubmissionResponse(BaseModel):
    id: int
    problem_id: int
    language: str
    code: str
    status: str
    runtime_ms: float
    memory_kb: float
    test_cases_passed: int
    total_test_cases: int
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Interview Schemas ---
class InterviewCreate(BaseModel):
    interview_type: str = "Technical"  # Technical, HR, Mixed
    target_role: str = "Full Stack Developer"
    difficulty: str = "Medium"  # Easy, Medium, Hard
    total_questions: int = 5  # 5, 10
    use_resume: bool = True


class InterviewQuestionOut(BaseModel):
    id: int
    question_order: int
    category: str
    difficulty: str
    question_text: str

    class Config:
        from_attributes = True


class InterviewDetail(BaseModel):
    id: int
    interview_type: str
    target_role: str
    initial_difficulty: str
    current_difficulty: str
    total_questions: int
    status: str
    overall_score: float
    started_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    auto_submit_reason: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    questions: List[InterviewQuestionOut] = []
    current_question: Optional[InterviewQuestionOut] = None

    class Config:
        from_attributes = True


class AIEvaluationResult(BaseModel):
    score: float
    technical_correctness: float
    relevance: float
    completeness: float
    strengths: List[str] = []
    weaknesses: List[str] = []
    better_answer: str = ""
    improvement_suggestion: str = ""
    filler_words_count: int = 0
    communication_score: float = 0.0
    communication_feedback: List[str] = []


class InterviewAnswerRequest(BaseModel):
    answer: str
    duration_seconds: int = 45


class InterviewAnswerResponse(BaseModel):
    previous_difficulty: str
    updated_difficulty: str
    difficulty_change: str  # "increased", "maintained", "decreased"
    is_completed: bool
    question_order: int
    total_questions: int
    next_question: Optional[InterviewQuestionOut] = None
    evaluation: Optional[AIEvaluationResult] = None  # Saved to DB; kept hidden during interview


class HeartbeatResponse(BaseModel):
    status: str
    last_activity_at: datetime
    is_active: bool


class AutoSubmitRequest(BaseModel):
    reason: Optional[str] = "inactivity_timeout"


class InterviewEventOut(BaseModel):
    id: int
    question_id: int
    timestamp_str: str
    topic: str
    score: float
    mistake_summary: str
    missing_concepts: List[str]
    better_answer: Optional[str]
    improvement_tip: Optional[str]
    question_text: Optional[str] = None
    user_answer: Optional[str] = None

    class Config:
        from_attributes = True


class ReportOut(BaseModel):
    id: int
    interview_id: int
    overall_score: float
    technical_score: float
    communication_score: float
    relevance_score: float
    completeness_score: float
    strengths: List[str]
    weaknesses: List[str]
    mistakes: List[str]
    ai_summary: str
    recommended_topics: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Analytics Schemas ---
class AnalyticsOut(BaseModel):
    interviews_completed: int
    coding_problems_solved: int
    avg_interview_score: float
    practice_completed: int
    score_trends: List[Dict[str, Any]]
    topic_performance: List[Dict[str, Any]]
    weak_areas: List[str]
    recommended_practice: List[Dict[str, Any]]
    skill_breakdown: Dict[str, float]


# --- Admin Schemas ---
class AdminStats(BaseModel):
    total_users: int
    total_interviews: int
    completed_interviews: int
    avg_interview_score: float
    total_practice_attempts: int
    total_coding_submissions: int
    total_practice_questions: int
    total_coding_problems: int


class AdminUserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    is_admin: bool
    target_role: Optional[str] = None
    experience_level: Optional[str] = None
    interviews_count: int = 0
    coding_submissions_count: int = 0
    practice_attempts_count: int = 0

    class Config:
        from_attributes = True


class PracticeQuestionCreateOrUpdate(BaseModel):
    category: str
    difficulty: str
    title: str
    question_text: str
    explanation: str
    sample_answer: Optional[str] = None
    tags: Optional[List[str]] = []
    options: Optional[List[str]] = None
    correct_option: Optional[str] = None


class CodingProblemCreateOrUpdate(BaseModel):
    title: str
    slug: str
    difficulty: str
    category: str
    description: str
    constraints: str
    examples: List[Dict[str, Any]] = []
    starter_templates: Dict[str, str] = {}
    test_cases: List[Dict[str, Any]] = []
