import React from 'react';
import { Link } from 'react-router-dom';
import {
  BrainCircuit,
  Sparkles,
  ArrowRight,
  Code2,
  FileText,
  Clock,
  Mic,
  FileDown,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">AI Interview Simulator</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                AI-Powered
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-6 text-center max-w-5xl mx-auto flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/80 text-indigo-700 text-xs font-semibold mb-6 mx-auto shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-Powered Technical & Behavioral Interview Simulation</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
          Master Tech & HR Interviews with{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
            Real-Time AI Simulation
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed mb-10">
          Practice dynamic role-based interviews, solve LeetCode problems in an integrated Monaco IDE, analyze your PDF resume, inspect interactive <b>Mistake Timelines</b>, and measure your speech with <b>Communication Analysis</b>.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            to="/register"
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-base shadow-lg shadow-indigo-500/25 transition active:scale-95 flex items-center gap-2"
          >
            <span>Start Practicing Now</span>
            <ChevronRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="px-8 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-base border border-slate-300 shadow-xs transition active:scale-95 flex items-center gap-2"
          >
            <span>Sign In to Account</span>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 border border-indigo-100">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Adaptive AI Interviews</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Google Gemini evaluates technical depth, relevance, and completeness, dynamically adjusting difficulty (Score &ge; 8 raises, &lt; 5 lowers).
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5 border border-purple-100">
              <Clock className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-lg text-slate-900">Mistake Timeline</h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Unique
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Step-by-step interactive timeline breaking down exact concepts missed, timestamped answers, and optimal model answers.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 border border-blue-100">
              <Mic className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-lg text-slate-900">Communication Analysis</h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Unique
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Detects filler words ('um', 'actually', 'like'), evaluates articulation pace, word count, and provides structure coaching.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 border border-emerald-100">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">LeetCode Coding Sandbox</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Monaco Code Editor with Python, Java, and JavaScript support. Run test cases and submit with Judge0 API execution.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5 border border-amber-100">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">PDF Resume Intelligence</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Upload your resume to extract skills, project achievements, and generate custom interview questions specific to your background.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-5 border border-rose-100">
              <FileDown className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">ReportLab PDF Reports</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Download clean, beautifully rendered PDF scorecards with executive summaries, topic breakdowns, and study roadmaps.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 px-6 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-600">
          AI Interview Simulator • Next-Generation Tech & HR Interview Preparation
        </p>
        <p className="mt-1 text-slate-400">
          FastAPI • React • TypeScript • PostgreSQL • Gemini AI • Judge0 • ReportLab
        </p>
      </footer>
    </div>
  );
};
