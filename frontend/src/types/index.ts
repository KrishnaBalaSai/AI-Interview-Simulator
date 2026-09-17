export interface User {
  id: number;
  name: string;
  email: string;
  is_admin?: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Profile {
  id: number;
  user_id: number;
  name?: string;
  email?: string;
  phone?: string;
  education?: string;
  experience_level: string;
  target_role: string;
  skills: string[];
  projects: {
    title: string;
    description: string;
    technologies: string[];
  }[];
  updated_at: string;
}

export interface ResumeData {
  id: number;
  user_id: number;
  filename: string;
  score: number;
  extracted_skills: string[];
  technologies: string[];
  projects: {
    title: string;
    description: string;
    technologies?: string[];
  }[];
  education: string[];
  experience: string[];
  strengths: string[];
  improvements: string[];
  generated_questions: string[];
  created_at: string;
}

export interface PracticeQuestion {
  id: number;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  title: string;
  question_text: string;
  options?: string[];
  explanation: string;
  sample_answer?: string;
  tags: string[];
  is_bookmarked: boolean;
  last_score?: number;
  attempt_count: number;
}

export interface PracticeAttempt {
  id: number;
  question_id: number;
  user_answer: string;
  is_correct: boolean;
  score: number;
  feedback?: string;
  bookmarked: boolean;
  created_at: string;
}

export interface CodingProblem {
  id: number;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  pattern?: string;
  strategy?: string;
  identification?: string;
  reference?: string;
  leetcode_url?: string;
  gfg_url?: string;
  youtube_url?: string;
  companies?: string[];
  description?: string;
  constraints?: string;
  examples?: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  starter_templates?: Record<string, string>;
}

export interface CodingPatternGroup {
  topic: string;
  pattern_name: string;
  strategy?: string;
  identification?: string;
  problem_count: number;
  problems: CodingProblem[];
}

export interface CodingRunResult {
  status: string;
  stdout?: string;
  stderr?: string;
  runtime_ms: number;
  memory_kb: number;
  error?: string;
}

export interface CodingSubmission {
  id: number;
  problem_id: number;
  language: string;
  code: string;
  status: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Compilation Error' | 'Time Limit Exceeded';
  runtime_ms: number;
  memory_kb: number;
  test_cases_passed: number;
  total_test_cases: number;
  error_message?: string;
  created_at: string;
}

export interface InterviewQuestionItem {
  id: number;
  question_order: number;
  category: string;
  difficulty: string;
  question_text: string;
}

export interface InterviewDetail {
  id: number;
  interview_type: string;
  target_role: string;
  initial_difficulty: string;
  current_difficulty: string;
  total_questions: number;
  status: 'in_progress' | 'completed' | 'auto_submitted';
  overall_score: number;
  started_at?: string;
  last_activity_at?: string;
  auto_submit_reason?: string;
  created_at: string;
  completed_at?: string;
  questions: InterviewQuestionItem[];
  current_question?: InterviewQuestionItem;
}

export interface AIEvaluation {
  score: number;
  technical_correctness: number;
  relevance: number;
  completeness: number;
  strengths: string[];
  weaknesses: string[];
  better_answer: string;
  improvement_suggestion: string;
  filler_words_count: number;
  communication_score: number;
  communication_feedback: string[];
}

export interface InterviewAnswerResponse {
  evaluation?: AIEvaluation;
  previous_difficulty: string;
  updated_difficulty: string;
  difficulty_change: 'increased' | 'maintained' | 'decreased';
  is_completed: boolean;
  question_order: number;
  total_questions: number;
  next_question?: InterviewQuestionItem;
}

export type InterviewRoomState = 
  | 'INITIALIZING'
  | 'AI_SPEAKING'
  | 'LISTENING'
  | 'PAUSED'
  | 'PROCESSING'
  | 'COMPLETED';

export interface HeartbeatResponse {
  status: string;
  last_activity_at: string;
  is_active: boolean;
}

export interface MistakeTimelineEvent {
  id: number;
  question_id: number;
  timestamp_str: string;
  topic: string;
  score: number;
  mistake_summary: string;
  missing_concepts: string[];
  better_answer?: string;
  improvement_tip?: string;
  question_text?: string;
  user_answer?: string;
}

export interface InterviewReport {
  id: number;
  interview_id: number;
  overall_score: number;
  technical_score: number;
  communication_score: number;
  relevance_score: number;
  completeness_score: number;
  strengths: string[];
  weaknesses: string[];
  mistakes: string[];
  ai_summary: string;
  recommended_topics: string[];
  created_at: string;
}

export interface AnalyticsData {
  interviews_completed: number;
  coding_problems_solved: number;
  avg_interview_score: number;
  practice_completed: number;
  score_trends: {
    id: number;
    date: string;
    score: number;
    role: string;
    type: string;
  }[];
  topic_performance: {
    topic: string;
    score: number;
    total_questions: number;
  }[];
  weak_areas: string[];
  recommended_practice: {
    topic: string;
    reason: string;
    action_url: string;
  }[];
  skill_breakdown: {
    Technical: number;
    Communication: number;
    Relevance: number;
    Completeness: number;
  };
}

export interface AdminStats {
  total_users: number;
  total_interviews: number;
  completed_interviews: number;
  avg_interview_score: number;
  total_practice_attempts: number;
  total_coding_submissions: number;
  total_practice_questions: number;
  total_coding_problems: number;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
  is_admin: boolean;
  target_role?: string | null;
  experience_level?: string | null;
  interviews_count: number;
  coding_submissions_count: number;
  practice_attempts_count: number;
}

export interface AdminPracticeQuestion {
  id: number;
  category: string;
  difficulty: string;
  title: string;
  question_text: string;
  explanation: string;
  sample_answer?: string | null;
  tags?: string[];
  options?: string[] | null;
  correct_option?: string | null;
  attempts_count?: number;
}

export interface AdminCodingProblem {
  id: number;
  title: string;
  slug: string;
  difficulty: string;
  category: string;
  description: string;
  constraints: string;
  examples: any[];
  starter_templates: Record<string, string>;
  test_cases: any[];
  submissions_count?: number;
  accepted_count?: number;
}

export interface AdminInterview {
  id: number;
  candidate_name: string;
  candidate_email: string;
  target_role: string;
  interview_type: string;
  difficulty: string;
  status: string;
  overall_score: number;
  technical_score?: number | null;
  communication_score?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  has_report: boolean;
  report_id?: number | null;
}
