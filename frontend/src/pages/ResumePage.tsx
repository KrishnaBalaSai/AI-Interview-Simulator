import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Trash2,
  HelpCircle,
  GraduationCap,
  Briefcase,
  FolderGit2,
  ArrowRight,
} from 'lucide-react';
import { resumeService } from '../services/api';
import { ResumeData } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const ResumePage: React.FC = () => {
  const navigate = useNavigate();
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResume();
  }, []);

  const fetchResume = async () => {
    try {
      const data = await resumeService.getLatestResume();
      setResume(data);
    } catch {
      setResume(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF document.');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const res = await resumeService.uploadResume(file);
      setResume(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to analyze resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    try {
      await resumeService.deleteResume(id);
      setResume(null);
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Checking resume records..." />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            AI Resume Analyzer & Intelligence
          </h1>
          <p className="text-sm text-slate-500">
            Upload your PDF resume to extract skills, evaluate competitiveness, and generate tailored interview questions.
          </p>
        </div>

        {resume && (
          <button
            onClick={() => navigate('/interview/setup')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Practice Resume Interview</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Box */}
      <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-slate-300/80 hover:border-indigo-400 transition text-center shadow-sm">
        <input
          type="file"
          id="resume-file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
        />
        <label
          htmlFor="resume-file"
          className="cursor-pointer flex flex-col items-center justify-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            {uploading ? (
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-base">
              {uploading ? 'Analyzing Resume with Gemini AI...' : 'Click to upload your resume (PDF)'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports standard ATS single or multi-page PDF resumes up to 10MB
            </p>
          </div>
          <span className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition mt-2">
            Select Document
          </span>
        </label>
      </div>

      {/* Analysis Results Display */}
      {resume && (
        <div className="space-y-6">
          {/* Top Score & Meta Header */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{resume.filename}</h3>
                <p className="text-xs text-slate-400">
                  Uploaded on {new Date(resume.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Resume Match Score
                </span>
                <span className="text-3xl font-extrabold text-indigo-600">
                  {resume.score}<span className="text-lg text-slate-400">/100</span>
                </span>
              </div>
              <button
                onClick={() => handleDelete(resume.id)}
                title="Delete Resume"
                className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Extracted Skills & Technologies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Extracted Skills</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {resume.extracted_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200/60"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-purple-600" />
                <span>Core Technologies</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {resume.technologies.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200/60"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <h4 className="text-sm font-bold text-emerald-700 mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Profile Strengths</span>
              </h4>
              <ul className="space-y-2.5">
                {resume.strengths.map((str, idx) => (
                  <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <h4 className="text-sm font-bold text-amber-700 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Areas for Improvement</span>
              </h4>
              <ul className="space-y-2.5">
                {resume.improvements.map((imp, idx) => (
                  <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* AI Tailored Interview Questions Generated from Resume */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Gemini AI Generated Resume Questions</span>
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Our AI generated these targeted questions based on the specific projects and skills found in your resume:
            </p>
            <div className="space-y-3">
              {resume.generated_questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-3"
                >
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
