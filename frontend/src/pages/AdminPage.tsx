import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  BookOpen,
  Code2,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Database,
  BarChart3,
  X,
  UserCheck,
  UserX,
  FileCode2,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/api';
import {
  AdminStats,
  AdminUser,
  AdminPracticeQuestion,
  AdminCodingProblem,
  AdminInterview,
} from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();

  // Active Tab: 'overview' | 'users' | 'questions' | 'problems' | 'interviews'
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'questions' | 'problems' | 'interviews'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [questionsList, setQuestionsList] = useState<AdminPracticeQuestion[]>([]);
  const [questionCategory, setQuestionCategory] = useState('All');
  const [problemsList, setProblemsList] = useState<AdminCodingProblem[]>([]);
  const [interviewsList, setInterviewsList] = useState<AdminInterview[]>([]);

  // Modals state
  const [editingQuestion, setEditingQuestion] = useState<Partial<AdminPracticeQuestion> | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

  const [editingProblem, setEditingProblem] = useState<Partial<AdminCodingProblem> | null>(null);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [problemExamplesJson, setProblemExamplesJson] = useState('[]');
  const [problemTestCasesJson, setProblemTestCasesJson] = useState('[]');
  const [starterPythonCode, setStarterPythonCode] = useState('');

  const [selectedInterview, setSelectedInterview] = useState<AdminInterview | null>(null);

  // Fetch initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    if (type === 'success') {
      setSuccessMessage(text);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(text);
      setTimeout(() => setErrorMessage(null), 6000);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [statsData, usersData, questionsData, problemsData, interviewsData] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers(),
        adminService.getPracticeQuestions(),
        adminService.getCodingProblems(),
        adminService.getInterviews(100),
      ]);

      setStats(statsData);
      setUsersList(usersData);
      setQuestionsList(questionsData);
      setProblemsList(problemsData);
      setInterviewsList(interviewsData);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setErrorMessage(
        err.response?.data?.detail || 'Failed to load administrative records. Please check server status.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    showNotification('success', 'Admin records refreshed successfully.');
  };

  // --- User Management Handlers ---
  const handleToggleAdmin = async (targetUser: AdminUser) => {
    if (targetUser.id === user?.id) {
      showNotification('error', 'You cannot change your own admin role.');
      return;
    }
    const willBeAdmin = !targetUser.is_admin;
    const confirmMsg = willBeAdmin
      ? `Promote ${targetUser.name} (${targetUser.email}) to Administrator?`
      : `Revoke administrator access for ${targetUser.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await adminService.toggleAdmin(targetUser.id);
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_admin: willBeAdmin } : u))
      );
      showNotification(
        'success',
        `Successfully ${willBeAdmin ? 'promoted' : 'demoted'} ${targetUser.name}.`
      );
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to toggle admin status.');
    }
  };

  const handleDeleteUser = async (targetUser: AdminUser) => {
    if (targetUser.id === user?.id) {
      showNotification('error', 'You cannot delete your own account.');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to permanently delete candidate "${targetUser.name}" (${targetUser.email})? All associated interviews, reports, and practice submissions will be permanently wiped.`
      )
    ) {
      return;
    }

    try {
      await adminService.deleteUser(targetUser.id);
      setUsersList((prev) => prev.filter((u) => u.id !== targetUser.id));
      if (stats) {
        setStats({ ...stats, total_users: Math.max(0, stats.total_users - 1) });
      }
      showNotification('success', `Candidate ${targetUser.name} deleted successfully.`);
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to delete user.');
    }
  };

  // Filtered Users
  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.target_role && u.target_role.toLowerCase().includes(userSearch.toLowerCase()))
  );

  // --- Practice Questions Handlers ---
  const handleOpenNewQuestion = () => {
    setEditingQuestion({
      category: 'DSA',
      difficulty: 'Medium',
      title: '',
      question_text: '',
      explanation: '',
      sample_answer: '',
      tags: [],
    });
    setIsQuestionModalOpen(true);
  };

  const handleEditQuestion = (q: AdminPracticeQuestion) => {
    setEditingQuestion({ ...q });
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion?.title || !editingQuestion?.question_text || !editingQuestion?.explanation) {
      showNotification('error', 'Please fill in Title, Question Text, and Explanation.');
      return;
    }

    try {
      if (editingQuestion.id) {
        const updated = await adminService.updatePracticeQuestion(
          editingQuestion.id,
          editingQuestion
        );
        setQuestionsList((prev) =>
          prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
        );
        showNotification('success', 'Practice question updated successfully.');
      } else {
        const created = await adminService.createPracticeQuestion(editingQuestion);
        setQuestionsList((prev) => [created, ...prev]);
        if (stats) {
          setStats({ ...stats, total_practice_questions: stats.total_practice_questions + 1 });
        }
        showNotification('success', 'New practice question created successfully.');
      }
      setIsQuestionModalOpen(false);
      setEditingQuestion(null);
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to save question.');
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm('Delete this practice question from the platform?')) return;
    try {
      await adminService.deletePracticeQuestion(id);
      setQuestionsList((prev) => prev.filter((q) => q.id !== id));
      if (stats) {
        setStats({ ...stats, total_practice_questions: Math.max(0, stats.total_practice_questions - 1) });
      }
      showNotification('success', 'Question deleted successfully.');
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to delete question.');
    }
  };

  // Filtered Questions
  const filteredQuestions = questionsList.filter((q) => {
    if (questionCategory !== 'All' && q.category.toLowerCase() !== questionCategory.toLowerCase()) {
      return false;
    }
    return true;
  });

  // --- Coding Problems Handlers ---
  const handleOpenNewProblem = () => {
    setEditingProblem({
      title: '',
      slug: '',
      difficulty: 'Medium',
      category: 'Algorithms',
      description: '',
      constraints: '1 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9',
      examples: [
        {
          input: 'nums = [2,7,11,15], target = 9',
          output: '[0,1]',
          explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
        },
      ],
      starter_templates: {
        python: 'class Solution:\n    def solve(self, nums: list[int], target: int) -> list[int]:\n        # Write your code here\n        pass\n',
      },
      test_cases: [
        {
          input: '{"nums": [2, 7, 11, 15], "target": 9}',
          expected_output: '[0, 1]',
          is_hidden: false,
        },
      ],
    });
    setProblemExamplesJson(
      JSON.stringify(
        [
          {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0,1]',
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
          },
        ],
        null,
        2
      )
    );
    setProblemTestCasesJson(
      JSON.stringify(
        [
          {
            input: '{"nums": [2, 7, 11, 15], "target": 9}',
            expected_output: '[0, 1]',
            is_hidden: false,
          },
        ],
        null,
        2
      )
    );
    setStarterPythonCode(
      'class Solution:\n    def solve(self, nums: list[int], target: int) -> list[int]:\n        # Write your code here\n        pass\n'
    );
    setIsProblemModalOpen(true);
  };

  const handleEditProblem = (p: AdminCodingProblem) => {
    setEditingProblem({ ...p });
    setProblemExamplesJson(JSON.stringify(p.examples || [], null, 2));
    setProblemTestCasesJson(JSON.stringify(p.test_cases || [], null, 2));
    setStarterPythonCode(p.starter_templates?.python || '');
    setIsProblemModalOpen(true);
  };

  const handleSaveProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProblem?.title || !editingProblem?.slug || !editingProblem?.description) {
      showNotification('error', 'Please fill in Problem Title, Slug, and Description.');
      return;
    }

    let parsedExamples = [];
    let parsedTestCases = [];
    try {
      parsedExamples = JSON.parse(problemExamplesJson);
      parsedTestCases = JSON.parse(problemTestCasesJson);
    } catch {
      showNotification('error', 'Examples or Test Cases JSON is invalid. Please check syntax.');
      return;
    }

    const payload: Partial<AdminCodingProblem> = {
      ...editingProblem,
      examples: parsedExamples,
      test_cases: parsedTestCases,
      starter_templates: {
        ...(editingProblem.starter_templates || {}),
        python: starterPythonCode,
      },
    };

    try {
      if (editingProblem.id) {
        const updated = await adminService.updateCodingProblem(editingProblem.id, payload);
        setProblemsList((prev) =>
          prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
        );
        showNotification('success', 'Coding challenge updated successfully.');
      } else {
        const created = await adminService.createCodingProblem(payload);
        setProblemsList((prev) => [created, ...prev]);
        if (stats) {
          setStats({ ...stats, total_coding_problems: stats.total_coding_problems + 1 });
        }
        showNotification('success', 'New coding challenge created successfully.');
      }
      setIsProblemModalOpen(false);
      setEditingProblem(null);
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to save coding problem.');
    }
  };

  const handleDeleteProblem = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this coding challenge?')) {
      return;
    }
    try {
      await adminService.deleteCodingProblem(id);
      setProblemsList((prev) => prev.filter((p) => p.id !== id));
      if (stats) {
        setStats({ ...stats, total_coding_problems: Math.max(0, stats.total_coding_problems - 1) });
      }
      showNotification('success', 'Coding challenge removed successfully.');
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to delete coding problem.');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Authenticating and loading Admin Panel..." />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 select-none">
      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Admin Console</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Superadmin Privileges
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Postgres DB
                </span>
              </div>
              <p className="text-sm text-slate-300">
                Logged in as <span className="font-semibold text-white">{user?.email}</span>. Manage users, practice questions, coding challenges, and mock interview audits.
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-xs flex items-center gap-2 transition active:scale-95 self-start sm:self-auto shrink-0 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Records'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl overflow-x-auto border border-slate-200/60">
        {[
          { id: 'overview', label: 'Overview & Metrics', icon: BarChart3 },
          { id: 'users', label: `Candidates (${usersList.length})`, icon: Users },
          { id: 'questions', label: `Questions Bank (${questionsList.length})`, icon: BookOpen },
          { id: 'problems', label: `Coding Challenges (${problemsList.length})`, icon: Code2 },
          { id: 'interviews', label: `Interview Audits (${interviewsList.length})`, icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- TAB 1: OVERVIEW & METRICS --- */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Users</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.total_users}</h3>
                <p className="text-[11px] text-blue-600 font-medium mt-0.5">Active candidates</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mock Interviews</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.total_interviews}</h3>
                <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
                  {stats.completed_interviews} completed ({stats.total_interviews ? Math.round((stats.completed_interviews / stats.total_interviews) * 100) : 0}%)
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Score</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                  {stats.avg_interview_score > 0 ? `${stats.avg_interview_score}%` : 'N/A'}
                </h3>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Across completed runs</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Content Bank</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                  {stats.total_practice_questions + stats.total_coding_problems}
                </h3>
                <p className="text-[11px] text-purple-600 font-medium mt-0.5">
                  {stats.total_practice_questions} practice / {stats.total_coding_problems} coding
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* System Status */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>Engine & Services Status</span>
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-medium">PostgreSQL Database</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    Online (Port 5432)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-medium">Gemini AI Model</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                    gemini-2.5-flash
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-medium">Email Dispatcher</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                    EmailJS REST API
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-600 font-medium">RBAC Security Guard</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                    Admin Tokens Enforced
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Candidate Snapshot */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Recent Registered Candidates</span>
                </h2>
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <span>View All Candidates</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {usersList.slice(0, 5).map((u) => (
                  <div key={u.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {u.name ? u.name[0] : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{u.name}</span>
                          {u.is_admin && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">{u.email}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-700">
                        {u.interviews_count} interviews
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: CANDIDATES & USERS --- */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Registered Candidates Directory</h2>
              <p className="text-xs text-slate-500">
                View candidate profiles, assign/revoke administrator privileges, or delete accounts.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search candidate name or email..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Target Role</th>
                  <th className="px-5 py-3">Interviews</th>
                  <th className="px-5 py-3">Coding</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No candidates found matching "{userSearch}".
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === user?.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {u.name ? u.name[0] : 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">
                                {u.name} {isSelf && <span className="text-[10px] text-indigo-600">(You)</span>}
                              </p>
                              <p className="text-[11px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-medium">
                          {u.target_role || 'Not specified'}
                          {u.experience_level && (
                            <span className="block text-[10px] text-slate-400 capitalize">
                              {u.experience_level}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-700">
                          {u.interviews_count}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-700">
                          {u.coding_submissions_count}
                        </td>
                        <td className="px-5 py-3.5">
                          {u.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              <ShieldCheck className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                              Candidate
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleAdmin(u)}
                              disabled={isSelf}
                              title={u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                                isSelf
                                  ? 'opacity-30 cursor-not-allowed border-slate-200 text-slate-400'
                                  : u.is_admin
                                  ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {u.is_admin ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              <span>{u.is_admin ? 'Revoke' : 'Promote'}</span>
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={isSelf}
                              title={isSelf ? 'Cannot delete self' : 'Delete user'}
                              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                                isSelf
                                  ? 'opacity-30 cursor-not-allowed border-slate-200 text-slate-400'
                                  : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: PRACTICE QUESTIONS MANAGER --- */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['All', 'DSA', 'System Design', 'Behavioral', 'Frontend', 'Backend', 'Database'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setQuestionCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                      questionCategory === cat
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            <button
              onClick={handleOpenNewQuestion}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 self-start sm:self-auto shrink-0 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuestions.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200/80 text-slate-400 text-sm">
                No practice questions in this category. Click "Add Question" to create one.
              </div>
            ) : (
              filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {q.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          q.difficulty === 'Easy'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : q.difficulty === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{q.title}</h3>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {q.question_text}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      {q.attempts_count || 0} candidate attempts
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditQuestion(q)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                        title="Edit question"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- TAB 4: CODING CHALLENGES MANAGER --- */}
      {activeTab === 'problems' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Interactive Coding Challenges Bank</h2>
              <p className="text-xs text-slate-500">
                Configure LeetCode-style algorithmic coding challenges, starter templates, and test cases.
              </p>
            </div>

            <button
              onClick={handleOpenNewProblem}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 transition active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Challenge</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {problemsList.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono text-slate-400">{p.slug}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.difficulty === 'Easy'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : p.difficulty === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {p.difficulty}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{p.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{p.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <FileCode2 className="w-4 h-4 text-indigo-500" />
                    <span>{p.test_cases?.length || 0} Test Cases</span>
                    <span>•</span>
                    <span>{p.submissions_count || 0} Submissions</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditProblem(p)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                      title="Edit challenge"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProblem(p.id)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                      title="Delete challenge"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 5: CANDIDATE INTERVIEW AUDITS --- */}
      {activeTab === 'interviews' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Candidate Mock Interview Audit Logs</h2>
            <p className="text-xs text-slate-500">
              Live feed of candidate sessions, adaptive difficulty paths, and score performance metrics.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Session ID</th>
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Target Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Completed At</th>
                  <th className="px-5 py-3 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {interviewsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No candidate interview sessions recorded yet.
                    </td>
                  </tr>
                ) : (
                  interviewsList.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                        #{it.id}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900">{it.candidate_name}</p>
                        <p className="text-[11px] text-slate-400">{it.candidate_email}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">
                        {it.target_role}
                        <span className="block text-[10px] text-slate-400 capitalize">
                          {it.interview_type} • {it.difficulty}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            it.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : it.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {it.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold">
                        {it.overall_score > 0 ? (
                          <span
                            className={`${
                              it.overall_score >= 80
                                ? 'text-emerald-600'
                                : it.overall_score >= 65
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {Math.round(it.overall_score)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                        {it.completed_at
                          ? new Date(it.completed_at).toLocaleString()
                          : it.started_at
                          ? `Started: ${new Date(it.started_at).toLocaleDateString()}`
                          : 'Not started'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedInterview(it)}
                          className="px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold text-[11px] transition inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT PRACTICE QUESTION --- */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingQuestion?.id ? 'Edit Practice Question' : 'Create Practice Question'}
              </h2>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingQuestion?.category || 'DSA'}
                    onChange={(e) =>
                      setEditingQuestion((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {['DSA', 'System Design', 'Behavioral', 'Frontend', 'Backend', 'Database'].map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={editingQuestion?.difficulty || 'Medium'}
                    onChange={(e) =>
                      setEditingQuestion((prev) => ({ ...prev, difficulty: e.target.value }))
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Question Title</label>
                <input
                  type="text"
                  required
                  value={editingQuestion?.title || ''}
                  onChange={(e) =>
                    setEditingQuestion((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. Inverting a Binary Tree in O(N)"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Question Text</label>
                <textarea
                  required
                  rows={4}
                  value={editingQuestion?.question_text || ''}
                  onChange={(e) =>
                    setEditingQuestion((prev) => ({ ...prev, question_text: e.target.value }))
                  }
                  placeholder="State the interview question, parameters, and constraints..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Key Explanation / Concepts</label>
                <textarea
                  required
                  rows={3}
                  value={editingQuestion?.explanation || ''}
                  onChange={(e) =>
                    setEditingQuestion((prev) => ({ ...prev, explanation: e.target.value }))
                  }
                  placeholder="What key architectural concepts or algorithm nuances should the candidate touch upon?"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Model / Sample Answer</label>
                <textarea
                  rows={3}
                  value={editingQuestion?.sample_answer || ''}
                  onChange={(e) =>
                    setEditingQuestion((prev) => ({ ...prev, sample_answer: e.target.value }))
                  }
                  placeholder="An exemplary high-scoring answer..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-indigo-500/20 transition active:scale-95"
                >
                  {editingQuestion?.id ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE / EDIT CODING PROBLEM --- */}
      {isProblemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingProblem?.id ? 'Edit Coding Challenge' : 'Create Coding Challenge'}
              </h2>
              <button
                onClick={() => setIsProblemModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProblem} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Problem Title</label>
                  <input
                    type="text"
                    required
                    value={editingProblem?.title || ''}
                    onChange={(e) => {
                      const title = e.target.value;
                      const slug = title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');
                      setEditingProblem((prev) => ({
                        ...prev,
                        title,
                        slug: prev?.id ? prev.slug : slug,
                      }));
                    }}
                    placeholder="Two Sum"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Slug identifier</label>
                  <input
                    type="text"
                    required
                    value={editingProblem?.slug || ''}
                    onChange={(e) =>
                      setEditingProblem((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="two-sum"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={editingProblem?.difficulty || 'Medium'}
                    onChange={(e) =>
                      setEditingProblem((prev) => ({ ...prev, difficulty: e.target.value }))
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description (Markdown / Text)</label>
                <textarea
                  required
                  rows={4}
                  value={editingProblem?.description || ''}
                  onChange={(e) =>
                    setEditingProblem((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe the task, parameters, return format..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Constraints</label>
                <textarea
                  rows={2}
                  value={editingProblem?.constraints || ''}
                  onChange={(e) =>
                    setEditingProblem((prev) => ({ ...prev, constraints: e.target.value }))
                  }
                  placeholder="1 <= nums.length <= 10^4"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Starter Python Code Template
                </label>
                <textarea
                  rows={4}
                  value={starterPythonCode}
                  onChange={(e) => setStarterPythonCode(e.target.value)}
                  placeholder="class Solution:&#10;    def solve(self, ...):&#10;        pass"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-indigo-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Examples (JSON Array)
                  </label>
                  <textarea
                    rows={4}
                    value={problemExamplesJson}
                    onChange={(e) => setProblemExamplesJson(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono text-[11px] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Test Cases (JSON Array)
                  </label>
                  <textarea
                    rows={4}
                    value={problemTestCasesJson}
                    onChange={(e) => setProblemTestCasesJson(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono text-[11px] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProblemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-indigo-500/20 transition active:scale-95"
                >
                  {editingProblem?.id ? 'Update Challenge' : 'Save Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: INSPECT INTERVIEW AUDIT --- */}
      {selectedInterview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>Interview Session #{selectedInterview.id}</span>
              </h2>
              <button
                onClick={() => setSelectedInterview(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Candidate Details</p>
                <p className="font-bold text-slate-900 text-sm">{selectedInterview.candidate_name}</p>
                <p className="text-slate-600">{selectedInterview.candidate_email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Target Role</p>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedInterview.target_role}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{selectedInterview.interview_type}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Overall Score</p>
                  <p className="font-black text-slate-900 text-lg mt-0.5">
                    {selectedInterview.overall_score ? `${Math.round(selectedInterview.overall_score)}%` : 'In Progress'}
                  </p>
                </div>
              </div>

              {selectedInterview.technical_score !== undefined && selectedInterview.technical_score !== null && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                    <p className="text-indigo-600 font-semibold uppercase text-[10px]">Technical Correctness</p>
                    <p className="font-bold text-indigo-900 text-base mt-0.5">
                      {Math.round(selectedInterview.technical_score)}%
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                    <p className="text-purple-600 font-semibold uppercase text-[10px]">Communication Clarity</p>
                    <p className="font-bold text-purple-900 text-base mt-0.5">
                      {Math.round(selectedInterview.communication_score || 0)}%
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              {selectedInterview.has_report && (
                <a
                  href={`/interview/report/${selectedInterview.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                >
                  <span>Open Full AI Report</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={() => setSelectedInterview(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
