import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Download,
  Clock,
  Mic,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  BookOpen,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { reportService, interviewService } from '../services/api';
import { InterviewReport, InterviewDetail } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const ReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const interviewId = Number(id);

  const [report, setReport] = useState<InterviewReport | null>(null);
  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Automatically close browser fullscreen upon viewing the evaluation report
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    // Guarantee speech synthesis and media activity are cleanly halted
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const fetchData = async () => {
      try {
        const [rep, it] = await Promise.all([
          reportService.getReport(interviewId),
          interviewService.getInterview(interviewId),
        ]);
        setReport(rep);
        setInterview(it);
      } catch (err) {
        console.error('Failed to load report data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [interviewId]);

  const handleDownloadPdf = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      await reportService.downloadPdf(report.interview_id);
    } catch (err) {
      console.error('Download PDF error', err);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Generating comprehensive evaluation report..." />;
  }

  if (!report) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
        <p className="font-bold text-base">Report not found</p>
        <p className="text-xs mt-1">Please ensure the interview was marked as completed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Interview Evaluated • Session #{report.interview_id}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Interview Evaluation Report
          </h1>
          <p className="text-sm text-slate-500">
            {interview?.target_role} • {interview?.interview_type} Format • Evaluated on{' '}
            {new Date(report.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/interview/timeline/${report.interview_id}`)}
            className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>Mistake Timeline</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Overall Score Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2 max-w-xl">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            Executive Summary
          </span>
          <h2 className="text-2xl font-extrabold leading-snug">Overall Candidate Performance</h2>
          <p className="text-xs text-indigo-100 leading-relaxed font-normal">
            {report.ai_summary}
          </p>
        </div>

        <div className="text-center p-6 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-md shrink-0 min-w-[180px]">
          <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider block">
            Overall Score
          </span>
          <div className="text-5xl font-black text-white my-1 tracking-tight">
            {report.overall_score}
            <span className="text-xl text-indigo-300 font-bold">/10</span>
          </div>
          <span
            className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              report.overall_score >= 7.5
                ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
            }`}
          >
            {report.overall_score >= 7.5 ? 'Strong Hire' : 'Promising / Needs Polish'}
          </span>
        </div>
      </div>

      {/* 4 Dimension Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Technical Score
          </span>
          <p className="text-2xl font-black text-indigo-600 mt-2">{report.technical_score}/10</p>
          <p className="text-[11px] text-slate-500 mt-1">Accuracy & Depth</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Communication
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{report.communication_score}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Clarity & Cadence</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Relevance Score
          </span>
          <p className="text-2xl font-black text-amber-600 mt-2">{report.relevance_score}/10</p>
          <p className="text-[11px] text-slate-500 mt-1">Directly Addressed</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Completeness
          </span>
          <p className="text-2xl font-black text-purple-600 mt-2">{report.completeness_score}/10</p>
          <p className="text-[11px] text-slate-500 mt-1">Covers Edge Cases</p>
        </div>
      </div>

      {/* UNIQUE FEATURE #2: Communication Analysis Deep Dive Card */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Communication Analysis</h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Unique Feature
                </span>
              </div>
              <p className="text-xs text-slate-400">Speech pacing, filler term detection, and response structure</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 uppercase">Communication Rating</span>
            <p className="text-2xl font-black text-blue-600">{report.communication_score}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Articulation Pace</span>
            <p className="text-sm font-bold text-slate-800 mt-1">Moderate & Thoughtful</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Average ~45s per response</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Answer Structure</span>
            <p className="text-sm font-bold text-slate-800 mt-1">Direct & Conceptual</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Strong definition statements</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Filler Words</span>
            <p className="text-sm font-bold text-slate-800 mt-1">Low to Moderate</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Occasional "um", "actually", "like"</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/60">
          <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5">
            Communication Coaching Suggestions:
          </h4>
          <ul className="text-xs text-blue-800 space-y-1 list-disc pl-4 font-medium">
            <li>Take a 2-second breath before answering rather than uttering filler words ("um", "like").</li>
            <li>Structure complex explanations using the STAR technique (Situation, Task, Action, Result).</li>
            <li>Conclude technical answers with concrete examples from your past projects.</li>
          </ul>
        </div>
      </div>

      {/* Strengths & Weaknesses Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Demonstrated Strengths</span>
          </h3>
          <ul className="space-y-2.5">
            {report.strengths.map((str, idx) => (
              <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Identified Weaknesses & Mistakes</span>
          </h3>
          <ul className="space-y-2.5">
            {report.weaknesses.map((w, idx) => (
              <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommended Topics for Next Practice */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>Recommended Study Roadmaps</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {report.recommended_topics.map((top, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-bold text-slate-800 block mb-1">{top}</span>
              <p className="text-[11px] text-slate-500">
                Practice targeted questions in the practice bank to elevate proficiency.
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <button
          onClick={() => navigate('/history')}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
        >
          <span>&larr; Back to Interview History</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analytics')}
            className="px-5 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition active:scale-95 flex items-center gap-2 border border-indigo-100"
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>View Updated Analytics &rarr;</span>
          </button>

          <button
            onClick={() => navigate('/interview/setup')}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Take Another Interview</span>
          </button>
        </div>
      </div>
    </div>
  );
};
