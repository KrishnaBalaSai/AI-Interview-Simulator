import axios from 'axios';
import {
  AuthResponse,
  User,
  Profile,
  ResumeData,
  PracticeQuestion,
  PracticeAttempt,
  CodingProblem,
  CodingPatternGroup,
  CodingRunResult,
  CodingSubmission,
  InterviewDetail,
  InterviewAnswerResponse,
  HeartbeatResponse,
  MistakeTimelineEvent,
  InterviewReport,
  AnalyticsData,
  AdminStats,
  AdminUser,
  AdminPracticeQuestion,
  AdminCodingProblem,
  AdminInterview,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect if checking auth status
      if (!error.config.url?.includes('/auth/login') && !error.config.url?.includes('/auth/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export interface OTPResponse {
  message: string;
  email: string;
  dev_mode?: boolean;
  dev_otp?: string;
}

export const authService = {
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  register: (data: { name: string; email: string; password: string; confirm_password: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
  requestRegisterOTP: (data: { name: string; email: string; password: string; confirm_password: string }) =>
    api.post<OTPResponse>('/auth/register/request-otp', data).then((r) => r.data),
  verifyRegisterOTP: (data: { email: string; otp: string }) =>
    api.post<AuthResponse>('/auth/register/verify-otp', data).then((r) => r.data),
  requestForgotPasswordOTP: (data: { email: string }) =>
    api.post<OTPResponse>('/auth/forgot-password/request-otp', data).then((r) => r.data),
  resetPasswordWithOTP: (data: { email: string; otp: string; new_password: string; confirm_password: string }) =>
    api.post<{ message: string }>('/auth/forgot-password/reset', data).then((r) => r.data),
  resendOTP: (data: { email: string; otp_type: 'register' | 'forgot_password' }) =>
    api.post<OTPResponse>('/auth/resend-otp', data).then((r) => r.data),
  getMe: () => api.get<User>('/auth/me').then((r) => r.data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post<{ message: string }>('/auth/change-password', data).then((r) => r.data),
  deleteAccount: () =>
    api.delete<{ message: string }>('/auth/delete-account').then((r) => r.data),
};

export const profileService = {
  getProfile: () => api.get<Profile>('/profile').then((r) => r.data),
  updateProfile: (data: Partial<Profile>) =>
    api.put<Profile>('/profile', data).then((r) => r.data),
};

export const resumeService = {
  uploadResume: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ResumeData>('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  getLatestResume: () => api.get<ResumeData>('/resume').then((r) => r.data),
  deleteResume: (id: number) => api.delete(`/resume/${id}`).then((r) => r.data),
};

export const practiceService = {
  getQuestions: (params?: { category?: string; difficulty?: string; search?: string; bookmarked_only?: boolean }) =>
    api.get<PracticeQuestion[]>('/practice/questions', { params }).then((r) => r.data),
  getQuestion: (id: number) => api.get<PracticeQuestion>(`/practice/questions/${id}`).then((r) => r.data),
  attemptQuestion: (id: number, answer: string) =>
    api.post<PracticeAttempt>(`/practice/questions/${id}/attempt`, { user_answer: answer }).then((r) => r.data),
  toggleBookmark: (id: number) =>
    api.post<{ bookmarked: boolean }>(`/practice/questions/${id}/bookmark`).then((r) => r.data),
  getHistory: () => api.get<PracticeAttempt[]>('/practice/history').then((r) => r.data),
};

export const codingService = {
  getProblems: (params?: { difficulty?: string; category?: string; pattern?: string; search?: string }) =>
    api.get<CodingProblem[]>('/coding/problems', { params }).then((r) => r.data),
  getPatterns: (topic?: string) =>
    api.get<CodingPatternGroup[]>('/coding/patterns', { params: topic && topic !== 'All' ? { topic } : {} }).then((r) => r.data),
  getProblem: (id: number) => api.get<CodingProblem>(`/coding/problems/${id}`).then((r) => r.data),
  runCode: (problemId: number, data: { language: string; code: string; custom_input?: string }) =>
    api.post<CodingRunResult>(`/coding/problems/${problemId}/run`, data).then((r) => r.data),
  submitCode: (problemId: number, data: { language: string; code: string }) =>
    api.post<CodingSubmission>(`/coding/problems/${problemId}/submit`, data).then((r) => r.data),
  getSubmissions: (problemId?: number) =>
    api.get<CodingSubmission[]>('/coding/submissions', { params: { problem_id: problemId } }).then((r) => r.data),
};

export const interviewService = {
  createInterview: (data: {
    interview_type: string;
    target_role: string;
    difficulty: string;
    total_questions: number;
    use_resume: boolean;
  }) => api.post<InterviewDetail>('/interviews', data).then((r) => r.data),
  getInterviews: () => api.get<InterviewDetail[]>('/interviews').then((r) => r.data),
  getInterview: (id: number) => api.get<InterviewDetail>(`/interviews/${id}`).then((r) => r.data),
  submitAnswer: (interviewId: number, data: { answer: string; duration_seconds: number }) =>
    api.post<InterviewAnswerResponse>(`/interviews/${interviewId}/answer`, data).then((r) => r.data),
  completeInterview: (interviewId: number) =>
    api.post(`/interviews/${interviewId}/complete`).then((r) => r.data),
  heartbeat: (interviewId: number) =>
    api.post<HeartbeatResponse>(`/interviews/${interviewId}/heartbeat`).then((r) => r.data),
  autoSubmit: (interviewId: number, reason?: string) =>
    api.post(`/interviews/${interviewId}/auto-submit`, { reason: reason || 'inactivity_timeout' }).then((r) => r.data),
  getMistakes: (interviewId: number) =>
    api.get<MistakeTimelineEvent[]>(`/interviews/${interviewId}/mistakes`).then((r) => r.data),
};

export const reportService = {
  getReport: (id: number) => api.get<InterviewReport>(`/reports/${id}`).then((r) => r.data),
  downloadPdf: async (id: number) => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const response = await axios.get(`${baseUrl}/reports/${id}/pdf`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `interview_report_${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};

export const analyticsService = {
  getAnalytics: () => api.get<AnalyticsData>('/analytics').then((r) => r.data),
};

export const adminService = {
  getStats: () => api.get<AdminStats>('/admin/stats').then((r) => r.data),
  getUsers: (search?: string) =>
    api.get<AdminUser[]>('/admin/users', { params: search ? { search } : {} }).then((r) => r.data),
  toggleAdmin: (userId: number) =>
    api.put<{ message: string }>(`/admin/users/${userId}/toggle-admin`).then((r) => r.data),
  deleteUser: (userId: number) =>
    api.delete<{ message: string }>(`/admin/users/${userId}`).then((r) => r.data),
  getPracticeQuestions: (category?: string) =>
    api
      .get<AdminPracticeQuestion[]>('/admin/practice-questions', {
        params: category && category !== 'All' ? { category } : {},
      })
      .then((r) => r.data),
  createPracticeQuestion: (data: Partial<AdminPracticeQuestion>) =>
    api.post<AdminPracticeQuestion>('/admin/practice-questions', data).then((r) => r.data),
  updatePracticeQuestion: (id: number, data: Partial<AdminPracticeQuestion>) =>
    api.put<AdminPracticeQuestion>(`/admin/practice-questions/${id}`, data).then((r) => r.data),
  deletePracticeQuestion: (id: number) =>
    api.delete<{ message: string }>(`/admin/practice-questions/${id}`).then((r) => r.data),
  getCodingProblems: () =>
    api.get<AdminCodingProblem[]>('/admin/coding-problems').then((r) => r.data),
  createCodingProblem: (data: Partial<AdminCodingProblem>) =>
    api.post<AdminCodingProblem>('/admin/coding-problems', data).then((r) => r.data),
  updateCodingProblem: (id: number, data: Partial<AdminCodingProblem>) =>
    api.put<AdminCodingProblem>(`/admin/coding-problems/${id}`, data).then((r) => r.data),
  deleteCodingProblem: (id: number) =>
    api.delete<{ message: string }>(`/admin/coding-problems/${id}`).then((r) => r.data),
  getInterviews: (limit?: number) =>
    api.get<AdminInterview[]>('/admin/interviews', { params: { limit: limit || 50 } }).then((r) => r.data),
};

export default api;
