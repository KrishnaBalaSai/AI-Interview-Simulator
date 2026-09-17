import React, { useState, useEffect } from 'react';
import {
  Search,
  Bookmark,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Send,
  X,
  History,
  Tag,
} from 'lucide-react';
import { practiceService } from '../services/api';
import { PracticeQuestion, PracticeAttempt } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

const CATEGORIES = [
  'All',
  'Python',
  'Java',
  'JavaScript',
  'React',
  'FastAPI',
  'SQL',
  'DSA',
  'DBMS',
  'HR',
];

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

export const PracticePage: React.FC = () => {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [search, setSearch] = useState('');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // Active question modal / viewer
  const [activeQuestion, setActiveQuestion] = useState<PracticeQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<PracticeAttempt | null>(null);

  // History modal
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<PracticeAttempt[]>([]);

  useEffect(() => {
    fetchQuestions();
  }, [selectedCategory, selectedDifficulty, bookmarkedOnly]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await practiceService.getQuestions({
        category: selectedCategory,
        difficulty: selectedDifficulty,
        search: search.trim() || undefined,
        bookmarked_only: bookmarkedOnly,
      });
      setQuestions(data);
    } catch (err) {
      console.error('Failed to load questions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleOpenQuestion = (q: PracticeQuestion) => {
    setActiveQuestion(q);
    setUserAnswer('');
    setAttemptResult(null);
  };

  const handleToggleBookmark = async (qId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await practiceService.toggleBookmark(qId);
      setQuestions((prev) =>
        prev.map((q) => (q.id === qId ? { ...q, is_bookmarked: res.bookmarked } : q))
      );
      if (activeQuestion && activeQuestion.id === qId) {
        setActiveQuestion({ ...activeQuestion, is_bookmarked: res.bookmarked });
      }
    } catch (err) {
      console.error('Bookmark toggle failed', err);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!activeQuestion || !userAnswer.trim()) return;
    setSubmitting(true);
    try {
      const res = await practiceService.attemptQuestion(activeQuestion.id, userAnswer);
      setAttemptResult(res);
      // update attempt count
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === activeQuestion.id
            ? { ...q, attempt_count: q.attempt_count + 1, last_score: res.score }
            : q
        )
      );
    } catch (err) {
      console.error('Attempt failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadHistory = async () => {
    setShowHistory(true);
    try {
      const hist = await practiceService.getHistory();
      setHistory(hist);
    } catch (err) {
      console.error('History failed', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Question Practice Hub
          </h1>
          <p className="text-sm text-slate-500">
            Sharpen your conceptual foundations across 9 interview categories with instant AI evaluation.
          </p>
        </div>

        <button
          onClick={handleLoadHistory}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-xs transition flex items-center gap-2 self-start sm:self-auto"
        >
          <History className="w-4 h-4 text-indigo-600" />
          <span>Practice History</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search, Difficulty, Bookmarks */}
        <div className="flex flex-col md:flex-row items-center gap-4 pt-2 border-t border-slate-100">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search concepts, keywords, or topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            />
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  Difficulty: {d}
                </option>
              ))}
            </select>

            <button
              onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shrink-0 ${
                bookmarkedOnly
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${bookmarkedOnly ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>Bookmarked</span>
            </button>
          </div>
        </div>
      </div>

      {/* Questions Grid */}
      {loading ? (
        <LoadingSpinner text="Fetching questions..." />
      ) : questions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {questions.map((q) => (
            <div
              key={q.id}
              onClick={() => handleOpenQuestion(q)}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                    {q.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        q.difficulty === 'Easy'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : q.difficulty === 'Medium'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                    <button
                      onClick={(e) => handleToggleBookmark(q.id, e)}
                      className="text-slate-300 hover:text-amber-500 transition p-1"
                    >
                      <Bookmark
                        className={`w-4 h-4 ${q.is_bookmarked ? 'fill-amber-500 text-amber-500' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-2 group-hover:text-indigo-600 transition">
                  {q.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {q.question_text}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {q.tags?.slice(0, 2).join(', ') || q.category}
                </span>
                <span className="text-indigo-600 group-hover:translate-x-0.5 transition flex items-center gap-0.5 font-bold">
                  <span>Practice</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 shadow-sm">
          <BookOpen className="w-12 h-12 mx-auto mb-3 stroke-1 text-slate-300" />
          <p className="font-bold text-slate-700 text-base">No practice questions found</p>
          <p className="text-xs mt-1">Try adjusting your filters or search query.</p>
        </div>
      )}

      {/* Question Detail & Answer Submission Modal */}
      {activeQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                    {activeQuestion.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                    {activeQuestion.difficulty}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">{activeQuestion.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleBookmark(activeQuestion.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-slate-50 transition"
                >
                  <Bookmark
                    className={`w-5 h-5 ${
                      activeQuestion.is_bookmarked ? 'fill-amber-500 text-amber-500' : ''
                    }`}
                  />
                </button>
                <button
                  onClick={() => setActiveQuestion(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800 leading-relaxed font-medium">
              {activeQuestion.question_text}
            </div>

            {/* Answer Box */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Your Answer / Explanation:
              </label>
              <textarea
                rows={5}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Explain the concept clearly, covering definitions, underlying mechanisms, and examples..."
                className="w-full p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !userAnswer.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit for AI Evaluation</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Feedback & Sample Answer */}
            {attemptResult && (
              <div className="p-6 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      AI Feedback
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold shadow-xs ${
                        attemptResult.is_correct
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {attemptResult.is_correct ? 'Passed' : 'Needs Work'}
                    </span>
                  </div>
                  <span className="text-lg font-extrabold text-indigo-700">
                    Score: {attemptResult.score}/10
                  </span>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line bg-white/80 p-4 rounded-xl border border-indigo-100/70 shadow-xs">
                  {attemptResult.feedback}
                </div>

                {activeQuestion.explanation && (
                  <div className="pt-3 border-t border-indigo-200/60">
                    <h4 className="text-xs font-bold text-indigo-900 mb-1">Detailed Explanation:</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {activeQuestion.explanation}
                    </p>
                  </div>
                )}

                {activeQuestion.sample_answer && (
                  <div className="pt-3 border-t border-indigo-200/60">
                    <h4 className="text-xs font-bold text-indigo-900 mb-1">Model Sample Answer:</h4>
                    <p className="text-xs text-slate-600 leading-relaxed italic bg-white/70 p-3 rounded-xl border border-indigo-100">
                      "{activeQuestion.sample_answer}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Drawer Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Recent Practice Attempts</span>
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-800">
                        Score: {h.score}/10 ({h.is_correct ? 'Passed' : 'Needs Review'})
                      </span>
                      <span className="text-slate-400">
                        {new Date(h.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-2 italic mb-2">"{h.user_answer}"</p>
                    {h.feedback && <p className="text-indigo-700 font-medium">{h.feedback}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No practice attempts recorded yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
