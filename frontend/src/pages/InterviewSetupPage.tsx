import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Briefcase,
  Layers,
  HelpCircle,
  FileText,
  Play,
  Check,
} from 'lucide-react';
import { interviewService } from '../services/api';

const ROLES = [
  'Python Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Software Engineer',
];

const TYPES = [
  { id: 'Technical', title: 'Technical Interview', desc: 'Core architecture, languages, algorithms, databases' },
  { id: 'HR', title: 'HR & Behavioral', desc: 'STAR method questions, teamwork, cultural fit' },
  { id: 'Mixed', title: 'Mixed Simulation', desc: 'Holistic round with both technical deep dives & behavioral scenarios' },
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const QUESTION_COUNTS = [5, 10];

export const InterviewSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [interviewType, setInterviewType] = useState('Technical');
  const [targetRole, setTargetRole] = useState('Full Stack Developer');
  const [difficulty, setDifficulty] = useState('Medium');
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [useResume, setUseResume] = useState(true);
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    setStarting(true);
    try {
      const session = await interviewService.createInterview({
        interview_type: interviewType,
        target_role: targetRole,
        difficulty,
        total_questions: totalQuestions,
        use_resume: useResume,
      });
      navigate(`/interview/live/${session.id}`);
    } catch (err) {
      console.error('Failed to create interview', err);
      alert('Failed to initialize mock interview. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Adaptive Interview Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Configure Your Mock Interview
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Customize your interview domain, role, question volume, and AI difficulty scaling.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-8">
        {/* Step 1: Target Role */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            <span>1. Target Role</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setTargetRole(role)}
                className={`p-4 rounded-2xl border text-left font-bold text-xs transition flex items-center justify-between ${
                  targetRole === role
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span>{role}</span>
                {targetRole === role && <Check className="w-4 h-4 text-indigo-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Interview Type */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>2. Interview Format</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setInterviewType(t.id)}
                className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                  interviewType === t.id
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-xs">{t.title}</h4>
                    {interviewType === t.id && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 font-normal leading-relaxed">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Initial Difficulty */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>3. Initial Difficulty</span>
            </label>
            <span className="text-[11px] text-indigo-600 font-semibold">
              Difficulty scales dynamically based on your performance
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`py-3 rounded-2xl border font-bold text-xs text-center transition ${
                  difficulty === d
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Number of Questions */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>4. Session Length</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {QUESTION_COUNTS.map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setTotalQuestions(cnt)}
                className={`py-3 rounded-2xl border font-bold text-xs text-center transition flex items-center justify-center gap-2 ${
                  totalQuestions === cnt
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span>{cnt} Questions</span>
                <span className="text-[11px] font-normal text-slate-400">
                  (~{cnt * 2} minutes)
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 5: Resume Context */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Include Uploaded Resume Context</p>
              <p className="text-[11px] text-slate-500">
                Tailor questions specifically to your past projects and claimed skills
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={useResume}
            onChange={(e) => setUseResume(e.target.checked)}
            className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
          />
        </div>

        {/* Start CTA */}
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {starting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Start Live AI Interview</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
