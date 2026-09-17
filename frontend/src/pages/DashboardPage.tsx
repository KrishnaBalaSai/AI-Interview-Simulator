import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Code2,
  BookOpen,
  Award,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  FileText,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { analyticsService, interviewService } from '../services/api';
import { AnalyticsData, InterviewDetail } from '../types';
import { MetricCard } from '../components/MetricCard';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [recentInterviews, setRecentInterviews] = useState<InterviewDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, interviewsRes] = await Promise.all([
          analyticsService.getAnalytics(),
          interviewService.getInterviews(),
        ]);
        setData(analyticsRes);
        setRecentInterviews(interviewsRes.slice(0, 5));
      } catch (err) {
        console.error('Error loading dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading performance metrics..." />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 mb-4 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>AI-Powered Adaptive Mock Interview Simulation</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Ace Your Next High-Impact Tech Interview
          </h1>
          <p className="text-sm text-indigo-200 leading-relaxed mb-6 font-normal">
            Take adaptive AI mock interviews, practice algorithmic coding with instant execution, and inspect your mistake timeline.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/interview/setup')}
              className="px-5 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs shadow-md hover:bg-slate-100 transition active:scale-95 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Launch Mock Interview</span>
            </button>
            <button
              onClick={() => navigate('/coding')}
              className="px-5 py-2.5 rounded-xl bg-indigo-700/60 hover:bg-indigo-700/80 border border-indigo-500/30 text-white font-bold text-xs transition flex items-center gap-2"
            >
              <Code2 className="w-4 h-4 text-indigo-300" />
              <span>Practice Coding Problems</span>
            </button>
          </div>
        </div>
        {/* Background decorative glow */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Interviews Completed"
          value={data?.interviews_completed || 0}
          subtitle="Adaptive AI simulations"
          icon={Award}
          color="indigo"
          trend="+1 this week"
        />
        <MetricCard
          title="Coding Problems Solved"
          value={data?.coding_problems_solved || 0}
          subtitle="Accepted submissions"
          icon={Code2}
          color="emerald"
          trend="LeetCode style"
        />
        <MetricCard
          title="Average Interview Score"
          value={data?.avg_interview_score ? `${data.avg_interview_score}/10` : 'N/A'}
          subtitle="Overall performance rating"
          icon={Sparkles}
          color="purple"
          trend={data && data.avg_interview_score >= 7.5 ? 'Strong' : 'Improving'}
        />
        <MetricCard
          title="Practice Qs Attempted"
          value={data?.practice_completed || 0}
          subtitle="Across 9 tech categories"
          icon={BookOpen}
          color="blue"
          trend="Active"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Progression Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Interview Score Progression</h3>
              <p className="text-xs text-slate-400">Chronological score trajectory across mock interview sessions</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
              10-Point Scale
            </span>
          </div>

          <div className="h-64 w-full">
            {data?.score_trends && data.score_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.score_trends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: '#6366f1', r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <Clock className="w-8 h-8 mb-2 stroke-1" />
                <p>Complete your first mock interview to view score trajectory.</p>
              </div>
            )}
          </div>
        </div>

        {/* Topic Performance Bar Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Topic Proficiency</h3>
              <p className="text-xs text-slate-400">Score percentage by technology</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {data?.topic_performance && data.topic_performance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topic_performance.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="topic" stroke="#64748b" fontSize={11} width={65} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${val}%`, 'Proficiency']}
                  />
                  <Bar dataKey="score" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <BookOpen className="w-8 h-8 mb-2 stroke-1" />
                <p>Answer practice questions to see proficiency.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weak Areas & Recommended Practice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weak Areas Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Identified Weak Areas</h3>
              <p className="text-xs text-slate-400">Topics with proficiency below 75% requiring reinforcement</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {data?.weak_areas && data.weak_areas.length > 0 ? (
              data.weak_areas.map((weak, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-slate-800">{weak}</span>
                  </div>
                  <Link
                    to={`/practice?category=${weak}`}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    <span>Practice Now</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
                🎉 No critical weak areas detected! Keep up the great consistency.
              </div>
            )}
          </div>
        </div>

        {/* Recommended Practice Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">AI Recommended Practice</h3>
              <p className="text-xs text-slate-400">Personalized recommendations based on interview evaluations</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {data?.recommended_practice && data.recommended_practice.length > 0 ? (
              data.recommended_practice.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{rec.topic}</h4>
                    <p className="text-[11px] text-slate-500">{rec.reason}</p>
                  </div>
                  <button
                    onClick={() => navigate(rec.action_url)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs transition shrink-0 ml-2"
                  >
                    Start
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No current recommendations.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Interviews Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Interviews</h3>
            <p className="text-xs text-slate-400">Review mistakes, read AI reports, or retry sessions</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All History</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentInterviews.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="pb-3 px-2">Role</th>
                  <th className="pb-3 px-2">Type</th>
                  <th className="pb-3 px-2">Difficulty</th>
                  <th className="pb-3 px-2">Score</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInterviews.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-2 font-bold text-slate-800">{item.target_role}</td>
                    <td className="py-3.5 px-2 text-slate-600">{item.interview_type}</td>
                    <td className="py-3.5 px-2">
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-slate-100 text-slate-700">
                        {item.current_difficulty}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 font-extrabold text-indigo-600 text-sm">
                      {item.overall_score ? `${item.overall_score}/10` : '-'}
                    </td>
                    <td className="py-3.5 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          item.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {item.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/interview/timeline/${item.id}`)}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold transition"
                      >
                        Mistake Timeline
                      </button>
                      <button
                        onClick={() => navigate(`/interview/report/${item.id}`)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold transition"
                      >
                        Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-sm">
            No interview sessions taken yet. Click "Launch Mock Interview" to begin.
          </div>
        )}
      </div>
    </div>
  );
};
