import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const getPageTitle = (path: string) => {
    if (path.startsWith('/dashboard')) return 'Dashboard Overview';
    if (path.startsWith('/profile')) return 'User Profile';
    if (path.startsWith('/resume')) return 'Resume Analyzer';
    if (path.startsWith('/practice')) return 'Question Practice Hub';
    if (path.startsWith('/coding')) return 'Coding Practice Sandbox';
    if (path.startsWith('/interview/setup')) return 'Mock Interview Setup';
    if (path.startsWith('/interview/live')) return 'Live AI Mock Interview';
    if (path.startsWith('/interview/timeline')) return 'Mistake Timeline Review';
    if (path.startsWith('/interview/report')) return 'Interview Evaluation Report';
    if (path.startsWith('/history')) return 'Interview History';
    if (path.startsWith('/analytics')) return 'Performance Analytics';
    if (path.startsWith('/settings')) return 'Account Settings';
    return 'AI Interview Simulator';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">
          {getPageTitle(location.pathname)}
        </h2>
        <p className="text-xs text-slate-400">
          Prepare, Practice, and Ace Technical & HR Interviews
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/interview/setup')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Mock Interview</span>
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
          </button>

          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-slate-100 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              {user?.name?.split(' ')[0] || 'User'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
