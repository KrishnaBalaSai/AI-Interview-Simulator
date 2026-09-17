import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  BookOpen,
  Code2,
  Sparkles,
  History,
  BarChart3,
  Settings,
  LogOut,
  BrainCircuit,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Resume', path: '/resume', icon: FileText },
  { name: 'Practice', path: '/practice', icon: BookOpen },
  { name: 'Coding', path: '/coding', icon: Code2 },
  { name: 'Mock Interview', path: '/interview/setup', icon: Sparkles, badge: 'AI' },
  { name: 'History', path: '/history', icon: History },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen shrink-0 fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight text-slate-900 tracking-tight">Interview AI</h1>
          <p className="text-[11px] font-semibold text-indigo-600 tracking-wide uppercase">Simulator Pro</p>
        </div>
      </div>

      {/* Navigation links */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
        <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-semibold shadow-xs border border-indigo-100/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 transition-colors" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-xs">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        {user?.is_admin && (
          <div className="pt-3 mt-3 border-t border-slate-100">
            <div className="px-3 pb-2 text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center justify-between">
              <span>Administration</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold uppercase">
                Staff
              </span>
            </div>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 font-semibold shadow-xs border border-amber-200/80'
                    : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/50'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Admin Panel</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                Admin
              </span>
            </NavLink>
          </div>
        )}
      </div>

      {/* User profile card */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'User'}</p>
                {user?.is_admin && (
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold text-amber-700 bg-amber-100 rounded">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
