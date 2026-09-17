import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  FileText,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { interviewService } from '../services/api';
import { MistakeTimelineEvent } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const MistakeTimelinePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const interviewId = Number(id);

  const [events, setEvents] = useState<MistakeTimelineEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MistakeTimelineEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMistakes();
  }, [interviewId]);

  const fetchMistakes = async () => {
    try {
      const data = await interviewService.getMistakes(interviewId);
      setEvents(data);
      if (data.length > 0) {
        setSelectedEvent(data[0]);
      }
    } catch (err) {
      console.error('Failed to load mistake timeline', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Generating Interview Mistake Timeline..." />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unique Feature • Interactive Review</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Interview Mistake Timeline
          </h1>
          <p className="text-sm text-slate-500">
            Click through your interview timestamps to inspect missed concepts, feedback, and AI model answers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/interview/report/${interviewId}`)}
            className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>View Full Report</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Timeline on Left, Deep Dive Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Vertical Timeline */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Session Progression ({events.length} Questions)
          </h2>

          {events.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {events.map((ev, index) => {
                const isSelected = selectedEvent?.id === ev.id;
                const isHigh = ev.score >= 8.0;
                const isMid = ev.score >= 5.0 && ev.score < 8.0;

                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className={`relative p-4 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/70 shadow-sm'
                        : 'border-slate-200/80 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-6 top-5 -translate-x-1/2 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${
                        isHigh
                          ? 'border-emerald-500 text-emerald-500'
                          : isMid
                          ? 'border-amber-500 text-amber-500'
                          : 'border-rose-500 text-rose-500'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isHigh ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ev.timestamp_str}
                      </span>
                      <span
                        className={`font-extrabold px-2 py-0.5 rounded-md ${
                          isHigh
                            ? 'bg-emerald-100 text-emerald-800'
                            : isMid
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        Score: {ev.score}/10
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm">{ev.topic} Question</h4>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1 font-medium">
                      {ev.mistake_summary}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-purple-700 font-bold">
                      <span>Click to review details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">No timeline events recorded.</p>
          )}
        </div>

        {/* Right: Selected Question Deep Dive */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
          {selectedEvent ? (
            <>
              {/* Question Header & Score */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs border border-purple-100">
                    {selectedEvent.topic}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Timestamp: {selectedEvent.timestamp_str}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase">Question Score</span>
                  <p className="text-2xl font-extrabold text-indigo-600">
                    {selectedEvent.score}/10
                  </p>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Interview Question Asked
                </h4>
                <p className="text-sm font-bold text-slate-900 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 leading-relaxed">
                  {selectedEvent.question_text || 'Technical Question'}
                </p>
              </div>

              {/* Candidate's Answer */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Your Answer
                </h4>
                <p className="text-xs text-slate-700 bg-white p-4 rounded-2xl border border-slate-200 leading-relaxed italic">
                  "{selectedEvent.user_answer || 'No answer recorded.'}"
                </p>
              </div>

              {/* Identified Mistakes & Missing Concepts */}
              <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-3">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Identified Mistakes & Gaps</span>
                </h4>
                <p className="text-xs font-medium text-rose-900">{selectedEvent.mistake_summary}</p>

                {selectedEvent.missing_concepts && selectedEvent.missing_concepts.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-rose-700 uppercase">
                      Missing Concepts to Cover:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {selectedEvent.missing_concepts.map((concept, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-white border border-rose-200 text-rose-800 text-[11px] font-semibold"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Better Model Answer */}
              {selectedEvent.better_answer && (
                <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Ideal / Better Model Answer</span>
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-normal bg-white p-3 rounded-xl border border-indigo-100">
                    {selectedEvent.better_answer}
                  </p>
                </div>
              )}

              {/* Actionable Improvement Tip */}
              {selectedEvent.improvement_tip && (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                      Coach Recommendation
                    </span>
                    <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                      {selectedEvent.improvement_tip}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400 py-12 text-center">Select an event from the timeline to review.</p>
          )}
        </div>
      </div>
    </div>
  );
};
