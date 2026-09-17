import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  Send,
  Code2,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  History,
  Search,
  RotateCcw,
  ExternalLink,
  Youtube,
  Layers,
  Sparkles,
  BookOpen,
  Filter,
} from 'lucide-react';
import { codingService } from '../services/api';
import {
  CodingProblem,
  CodingPatternGroup,
  CodingRunResult,
  CodingSubmission,
} from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';

const LANGUAGES = [
  { id: 'python', label: 'Python 3', monaco: 'python' },
  { id: 'javascript', label: 'JavaScript (Node)', monaco: 'javascript' },
  { id: 'java', label: 'Java (OpenJDK)', monaco: 'java' },
];

const cleanDisplayText = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/\ufffd/g, '')
    .replace(/^[#]+\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .trim();
};

export const CodingPage: React.FC = () => {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [patternGroups, setPatternGroups] = useState<CodingPatternGroup[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedPattern, setSelectedPattern] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');

  // Editor & Runner State
  const [language, setLanguage] = useState<'python' | 'javascript' | 'java'>('python');
  const [code, setCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<CodingRunResult | null>(null);
  const [submissionResult, setSubmissionResult] = useState<CodingSubmission | null>(null);
  const [submissionsHistory, setSubmissionsHistory] = useState<CodingSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'description' | 'history'>('description');
  const [consoleTab, setConsoleTab] = useState<'output' | 'input'>('output');

  // Fetch patterns on mount
  useEffect(() => {
    fetchPatternGroups();
  }, []);

  // Fetch problems whenever filters change
  useEffect(() => {
    fetchProblems();
  }, [difficultyFilter, selectedPattern, selectedTopic]);

  const fetchPatternGroups = async () => {
    try {
      const groups = await codingService.getPatterns();
      setPatternGroups(groups);
    } catch (err) {
      console.error('Failed to load patterns', err);
    }
  };

  const fetchProblems = async () => {
    try {
      const list = await codingService.getProblems({
        difficulty: difficultyFilter !== 'All' ? difficultyFilter : undefined,
        pattern: selectedPattern !== 'All' ? selectedPattern : undefined,
        category: selectedTopic !== 'All' ? selectedTopic : undefined,
        search: search.trim() || undefined,
      });
      setProblems(list);
      if (list.length > 0) {
        // If current selected problem is not in new list, pick the first one
        if (!selectedProblem || !list.some((p) => p.id === selectedProblem.id)) {
          loadProblemDetail(list[0].id);
        }
      } else {
        setSelectedProblem(null);
      }
    } catch (err) {
      console.error('Failed to load coding problems', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProblems();
  };

  const loadProblemDetail = async (id: number) => {
    try {
      const detail = await codingService.getProblem(id);
      setSelectedProblem(detail);
      // Clean starter template: ONLY function definition & main driver, NO pre-written solution code
      const starter = detail.starter_templates?.[language] || '# Write your solution here\n';
      setCode(starter);
      setRunResult(null);
      setSubmissionResult(null);
      // Load history
      const history = await codingService.getSubmissions(id);
      setSubmissionsHistory(history);
    } catch (err) {
      console.error('Failed to load problem detail', err);
    }
  };

  const handleLanguageChange = (newLang: 'python' | 'javascript' | 'java') => {
    setLanguage(newLang);
    if (selectedProblem?.starter_templates?.[newLang]) {
      setCode(selectedProblem.starter_templates[newLang]);
    }
  };

  const handleResetCode = () => {
    if (selectedProblem?.starter_templates?.[language]) {
      setCode(selectedProblem.starter_templates[language]);
    } else {
      setCode('# Write your solution here\n');
    }
  };

  const handleRunCode = async () => {
    if (!selectedProblem) return;
    setIsRunning(true);
    setConsoleTab('output');
    setSubmissionResult(null);
    try {
      const res = await codingService.runCode(selectedProblem.id, {
        language,
        code,
        custom_input: customInput,
      });
      setRunResult(res);
    } catch (err: any) {
      setRunResult({
        status: 'Runtime Error',
        stderr: err.response?.data?.detail || 'Failed to run code.',
        runtime_ms: 0,
        memory_kb: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!selectedProblem) return;
    setIsSubmitting(true);
    setConsoleTab('output');
    try {
      const res = await codingService.submitCode(selectedProblem.id, {
        language,
        code,
      });
      setSubmissionResult(res);
      // Refresh history
      const history = await codingService.getSubmissions(selectedProblem.id);
      setSubmissionsHistory(history);
    } catch (err: any) {
      console.error('Submit failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derive unique topics from patternGroups
  const topics = ['All', ...Array.from(new Set(patternGroups.map((g) => g.topic).filter(Boolean)))];

  // Filter pattern options by selected topic
  const availablePatterns = patternGroups
    .filter((g) => selectedTopic === 'All' || g.topic === selectedTopic)
    .map((g) => g.pattern_name);
  const uniquePatterns = ['All', ...Array.from(new Set(availablePatterns))];

  if (loading) {
    return <LoadingSpinner text="Loading coding problems & patterns from Rising Brain..." />;
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-3">
      {/* Pattern-wise Filter & Navigation Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
        {/* Row 1: Search, Topic, Pattern, Difficulty, Problem Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Problem Selector & Topic/Pattern Info */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-50 to-purple-50 text-indigo-600 border border-indigo-100 flex items-center gap-1.5 shadow-xs">
              <Code2 className="w-4 h-4" />
              <span className="text-xs font-black tracking-tight text-indigo-900 hidden sm:inline">DSA Sheet</span>
            </div>

            {/* Problem Select Dropdown */}
            <select
              value={selectedProblem?.id || ''}
              onChange={(e) => loadProblemDetail(Number(e.target.value))}
              aria-label="Select Coding Problem"
              className="max-w-[260px] sm:max-w-[340px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/70 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 truncate"
            >
              {problems.length === 0 ? (
                <option value="">No problems match filters</option>
              ) : (
                problems.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.reference ? `[${p.reference}] ` : ''}{p.title} ({p.difficulty})
                  </option>
                ))
              )}
            </select>

            {/* Badges */}
            {selectedProblem && (
              <div className="hidden md:flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    selectedProblem.difficulty === 'Easy'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : selectedProblem.difficulty === 'Medium'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {selectedProblem.difficulty}
                </span>

                {selectedProblem.pattern && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    {selectedProblem.pattern}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Language, Reset, Run, Submit */}
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as any)}
              aria-label="Select Programming Language"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleResetCode}
              title="Reset to clean starter code (function definition only)"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting || !selectedProblem}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-slate-800" />
              <span>{isRunning ? 'Running...' : 'Run'}</span>
            </button>

            <button
              onClick={handleSubmitCode}
              disabled={isRunning || isSubmitting || !selectedProblem}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Testing...' : 'Submit'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Pattern Filters, Topic Filter, Difficulty, Search Bar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Topic Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Topic:</span>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setSelectedPattern('All');
              }}
              aria-label="Filter by Topic"
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold text-xs focus:outline-none"
            >
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Topics' : t}
                </option>
              ))}
            </select>
          </div>

          {/* Pattern Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-500" />
              Pattern:
            </span>
            <select
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value)}
              aria-label="Filter by Pattern"
              className="max-w-[200px] px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-indigo-700 font-bold text-xs focus:outline-none truncate"
            >
              {uniquePatterns.map((p) => (
                <option key={p} value={p}>
                  {p === 'All' ? 'All Patterns' : p}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Difficulty:</span>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              aria-label="Filter by Difficulty"
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold text-xs focus:outline-none"
            >
              <option value="All">All Levels</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1 ml-auto">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search problem, company..."
                className="pl-8 pr-3 py-1 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 sm:w-56"
              />
            </div>
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs transition"
            >
              Search
            </button>
          </form>

          {/* Count pill */}
          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {problems.length} problems
          </span>
        </div>
      </div>

      {/* Main Split Screen: Left (Problem Details & Pattern Tip) / Right (Monaco & Console) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Panel: Description, Pattern Strategy & Submissions */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center border-b border-slate-100 px-6 pt-4 gap-4">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-3 text-xs font-bold border-b-2 transition ${
                activeTab === 'description'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Description & Pattern
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Submissions ({submissionsHistory.length})</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
            {activeTab === 'description' ? (
              selectedProblem ? (
                <>
                  {/* Problem Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h2 className="text-xl font-black text-slate-900">
                        {selectedProblem.title}
                      </h2>
                      {selectedProblem.reference && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {selectedProblem.reference}
                        </span>
                      )}
                    </div>

                    {/* Company tags */}
                    {selectedProblem.companies && selectedProblem.companies.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        <span className="text-[10px] font-semibold text-slate-400">Asked by:</span>
                        {selectedProblem.companies.map((comp) => (
                          <span
                            key={comp}
                            className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-600"
                          >
                            {comp}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* External links: LeetCode, GFG, YouTube */}
                    <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-slate-100">
                      {selectedProblem.leetcode_url && (
                        <a
                          href={selectedProblem.leetcode_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition"
                        >
                          <span>LeetCode</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {selectedProblem.gfg_url && (
                        <a
                          href={selectedProblem.gfg_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition"
                        >
                          <span>GeeksforGeeks</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {selectedProblem.youtube_url && (
                        <a
                          href={selectedProblem.youtube_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition"
                        >
                          <Youtube className="w-3.5 h-3.5 text-rose-600" />
                          <span>Video Solution</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Pattern Strategy & Identification Tip Card */}
                  {(selectedProblem.strategy || selectedProblem.identification || selectedProblem.pattern) && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/70 border border-indigo-100/80 space-y-2">
                      <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Rising Brain Pattern: {cleanDisplayText(selectedProblem.pattern) || 'Core Pattern'}</span>
                      </div>
                      {selectedProblem.identification && (
                        <p className="text-xs text-indigo-950 font-medium">
                          <span className="font-bold text-indigo-700">How to identify:</span> {cleanDisplayText(selectedProblem.identification)}
                        </p>
                      )}
                      {selectedProblem.strategy && (
                        <p className="text-xs text-indigo-950 font-medium">
                          <span className="font-bold text-indigo-700">Approach / Strategy:</span> {cleanDisplayText(selectedProblem.strategy)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Problem Description */}
                  <div className="prose prose-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {cleanDisplayText(selectedProblem.description)}
                  </div>

                  {/* Examples */}
                  {selectedProblem.examples && selectedProblem.examples.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Examples
                      </h4>
                      {selectedProblem.examples.map((ex, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs font-mono space-y-1"
                        >
                          <p>
                            <span className="text-slate-400 font-sans">Input:</span> {cleanDisplayText(ex.input)}
                          </p>
                          <p>
                            <span className="text-slate-400 font-sans">Output:</span> {cleanDisplayText(ex.output)}
                          </p>
                          {ex.explanation && (
                            <p className="text-slate-500 font-sans text-[11px] pt-1">
                              Explanation: {cleanDisplayText(ex.explanation)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Constraints */}
                  {selectedProblem.constraints && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                        Constraints
                      </h4>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs font-mono whitespace-pre-line text-slate-700">
                        {cleanDisplayText(selectedProblem.constraints)}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <p>No problem selected or matches the active filters.</p>
                </div>
              )
            ) : (
              /* Submissions History */
              <div className="space-y-3">
                {submissionsHistory.length > 0 ? (
                  submissionsHistory.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              sub.status === 'Accepted' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {sub.status}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            {sub.language}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Passed {sub.test_cases_passed}/{sub.total_test_cases} test cases
                        </p>
                      </div>

                      <div className="text-right text-[11px] text-slate-500 font-mono">
                        <p>{sub.runtime_ms} ms</p>
                        <p>{new Date(sub.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No submissions yet for this problem.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Monaco Editor & Console */}
        <div className="lg:col-span-7 flex flex-col gap-3 min-h-0">
          {/* Monaco Editor Container */}
          <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col min-h-[340px]">
            <div className="h-10 bg-slate-900 text-slate-300 px-4 flex items-center justify-between text-xs font-mono border-b border-slate-800">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>
                  Solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'java'}
                </span>
              </span>
              <span className="text-[11px] text-slate-400 font-sans">
                Only function definition & main driver provided. Complete the solution!
              </span>
            </div>

            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                language={LANGUAGES.find((l) => l.id === language)?.monaco || 'python'}
                value={code}
                onChange={(val) => setCode(val || '')}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
            </div>
          </div>

          {/* Console / Output Drawer */}
          <div className="h-56 bg-slate-900 rounded-3xl border border-slate-800 shadow-md flex flex-col overflow-hidden text-slate-200">
            <div className="h-10 bg-slate-950 px-4 flex items-center justify-between border-b border-slate-800 text-xs">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setConsoleTab('output')}
                  className={`font-mono text-xs font-semibold ${
                    consoleTab === 'output' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Test Results & Console
                </button>
                <button
                  onClick={() => setConsoleTab('input')}
                  className={`font-mono text-xs font-semibold ${
                    consoleTab === 'input' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom Stdin Input
                </button>
              </div>

              {(submissionResult || runResult) && (
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {(submissionResult?.runtime_ms || runResult?.runtime_ms || 0).toFixed(0)} ms
                  </span>
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    {(submissionResult?.memory_kb || runResult?.memory_kb || 0).toFixed(0)} KB
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
              {consoleTab === 'input' ? (
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Provide custom input to test your program stdin..."
                  className="w-full h-full bg-transparent text-slate-100 font-mono text-xs focus:outline-none resize-none"
                />
              ) : (
                <>
                  {/* Submission Verdict */}
                  {submissionResult && (
                    <div className="mb-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {submissionResult.status === 'Accepted' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-400" />
                        )}
                        <div>
                          <span
                            className={`font-bold text-sm ${
                              submissionResult.status === 'Accepted'
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {submissionResult.status}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            Passed {submissionResult.test_cases_passed} of{' '}
                            {submissionResult.total_test_cases} test cases
                          </p>
                        </div>
                      </div>
                      {submissionResult.error_message && (
                        <p className="text-[11px] text-rose-300 max-w-xs truncate">
                          {submissionResult.error_message}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Run Output */}
                  {runResult && !submissionResult && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Execution Complete ({runResult.status})</span>
                      </div>
                      {runResult.stdout && (
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase">Standard Output:</p>
                          <pre className="text-slate-200 whitespace-pre-wrap">{runResult.stdout}</pre>
                        </div>
                      )}
                      {runResult.stderr && (
                        <div>
                          <p className="text-rose-400 text-[10px] uppercase">Standard Error:</p>
                          <pre className="text-rose-300 whitespace-pre-wrap">{runResult.stderr}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {!runResult && !submissionResult && (
                    <p className="text-slate-500">Click "Run" or "Submit" to evaluate your code.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
