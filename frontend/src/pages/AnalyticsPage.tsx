import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Award,
  Code2,
  BookOpen,
  AlertTriangle,
  ArrowUpRight,
  PieChart as PieIcon,
  Sparkles,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { analyticsService } from '../services/api';
import { AnalyticsData } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await analyticsService.getAnalytics();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Computing performance analytics..." />;
  }

  const radarData = data?.skill_breakdown
    ? Object.entries(data.skill_breakdown).map(([skill, val]) => ({
        skill,
        score: val,
        fullMark: 100,
      }))
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Performance Analytics
        </h1>
        <p className="text-sm text-slate-500">
          In-depth breakdown of your interview metrics, conceptual proficiencies, and coding solutions.
        </p>
      </div>

      {/* Top 4 Dimension Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Interviews Completed
          </span>
          <p className="text-3xl font-black text-indigo-600 mt-2">
            {data?.interviews_completed || 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">Full sessions</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Average Interview Score
          </span>
          <p className="text-3xl font-black text-purple-600 mt-2">
            {data?.avg_interview_score ? `${data.avg_interview_score}/10` : '-'}
          </p>
          <p className="text-xs text-slate-400 mt-1">10-point scale</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Coding Problems Solved
          </span>
          <p className="text-3xl font-black text-emerald-600 mt-2">
            {data?.coding_problems_solved || 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">LeetCode sandboxes</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Practice Qs Answered
          </span>
          <p className="text-3xl font-black text-blue-600 mt-2">
            {data?.practice_completed || 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">Across 9 domains</p>
        </div>
      </div>

      {/* Main Charts: Score Trend & Radar Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score Progression Line Chart */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Interview Score Trend</h3>
              <p className="text-xs text-slate-400">Score progress over time</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              Evaluations
            </span>
          </div>

          <div className="h-72 w-full">
            {data?.score_trends && data.score_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.score_trends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={11} tickLine={false} />
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
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ fill: '#4f46e5', r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No interview score data yet.
              </div>
            )}
          </div>
        </div>

        {/* Skill Matrix Radar Chart */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Competency Radar</h3>
              <p className="text-xs text-slate-400">4-dimensional skill matrix</p>
            </div>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="skill" stroke="#64748b" fontSize={11} />
                  <PolarRadiusAxis domain={[0, 100]} stroke="#cbd5e1" fontSize={10} />
                  <Radar
                    name="Proficiency"
                    dataKey="score"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.4}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No radar metrics yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Topic Performance Bar Chart & Weak Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Horizontal Bar Chart for Topics */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Domain Proficiency Breakdown</h3>
              <p className="text-xs text-slate-400">Calculated across practice attempts & interview questions</p>
            </div>
          </div>

          <div className="h-80 w-full">
            {data?.topic_performance && data.topic_performance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topic_performance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="topic" stroke="#475569" fontSize={11} width={80} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${val}%`, 'Proficiency']}
                  />
                  <Bar dataKey="score" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No topic proficiency data.
              </div>
            )}
          </div>
        </div>

        {/* Actionable Weak Areas and Study Recommendations */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Focus Priority Topics</h3>
                <p className="text-xs text-slate-400">Topics needing immediate practice</p>
              </div>
            </div>

            <div className="space-y-3">
              {data?.weak_areas && data.weak_areas.length > 0 ? (
                data.weak_areas.map((weak, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{weak}</h4>
                      <p className="text-[11px] text-amber-800 font-medium">Proficiency &lt; 75%</p>
                    </div>
                    <Link
                      to={`/practice?category=${weak}`}
                      className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 font-bold text-xs hover:bg-amber-100 transition flex items-center gap-1"
                    >
                      <span>Practice</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
                  All domains meet proficiency targets (&ge;75%).
                </div>
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                Coach Insight
              </h4>
            </div>
            <p className="text-xs text-indigo-800 leading-relaxed font-normal">
              Consistent practice on weak domains raises your adaptive interview difficulty to Hard, positioning you in the top 5% of candidate percentiles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
