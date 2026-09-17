import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Sparkles,
  Calendar,
  Clock,
  RotateCcw,
  FileText,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { interviewService } from '../services/api';
import { InterviewDetail } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await interviewService.getInterviews();
      setInterviews(data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Fetching interview sessions..." />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Interview History
          </h1>
          <p className="text-sm text-slate-500">
            Track all your past mock interviews, review feedback, and measure progression over time.
          </p>
        </div>

        <button
          onClick={() => navigate('/interview/setup')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center gap-2 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Simulation</span>
        </button>
      </div>

      {/* History Grid */}
      {interviews.length > 0 ? (
        <div className="space-y-4">
          {interviews.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-base text-slate-900">
                    {item.target_role}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                    {item.interview_type}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                    Difficulty: {item.current_difficulty}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.status === 'auto_submitted'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {item.status === 'completed'
                      ? 'Completed'
                      : item.status === 'auto_submitted'
                      ? 'Evaluated'
                      : 'In Progress'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(item.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span>•</span>
                  <span>{item.total_questions} Questions</span>
                </div>
              </div>

              {/* Score & Actions */}
              <div className="flex items-center gap-6 self-end md:self-auto">
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Score
                  </span>
                  <p className="text-2xl font-black text-indigo-600">
                    {item.overall_score ? `${item.overall_score}/10` : '-'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/interview/report/${item.id}`)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Report</span>
                  </button>

                  <button
                    onClick={() => navigate(`/interview/timeline/${item.id}`)}
                    className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mistakes</span>
                  </button>

                  <button
                    onClick={() => navigate('/interview/setup')}
                    title="Retry Interview"
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 shadow-sm">
          <History className="w-12 h-12 mx-auto mb-3 stroke-1 text-slate-300" />
          <p className="font-bold text-slate-700 text-base">No interview sessions recorded yet</p>
          <p className="text-xs mt-1 mb-4">Start your first mock interview to build your performance history.</p>
          <button
            onClick={() => navigate('/interview/setup')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm"
          >
            Launch Mock Interview
          </button>
        </div>
      )}
    </div>
  );
};
