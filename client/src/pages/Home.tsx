import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  BookOpen, Headphones, Mic, PenLine, BarChart3, Brain, Target,
  ChevronRight, Star, Users, Trophy, Clock, CheckCircle, ArrowRight,
  Zap, Shield, TrendingUp, Play, RotateCcw as RotateCcwIcon
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import HeroSection from "@/components/HeroSection";

const TASK_TYPES = [
  {
    section: "Speaking",
    id: "speaking",
    icon: Mic,
    accent: "#EF5350",
    tint: "#FEF2F2",
    time: "54-67 min",
    blurb: "Speak clearly and confidently on exam-style prompts.",
    tasks: [
      { name: "Read Aloud", questions: "6-7 questions", time: "~40s each" },
      { name: "Repeat Sentence", questions: "10-12 questions", time: "~40s each" },
      { name: "Describe Image", questions: "6-7 questions", time: "~40s each" },
      { name: "Re-tell Lecture", questions: "3-4 questions", time: "~90s each" },
      { name: "Answer Short Question", questions: "5-6 questions", time: "~20s each" },
    ],
  },
  {
    section: "Writing",
    id: "writing",
    icon: PenLine,
    accent: "#7C3AED",
    tint: "#F5F3FF",
    time: "50-60 min",
    blurb: "Structured writing with instant grammar and vocabulary feedback.",
    tasks: [
      { name: "Summarize Written Text", questions: "2-3 questions", time: "10 min each" },
      { name: "Write Essay", questions: "1-2 questions", time: "20 min each" },
    ],
  },
  {
    section: "Reading",
    id: "reading",
    icon: BookOpen,
    accent: "#059669",
    tint: "#ECFDF5",
    time: "32-41 min",
    blurb: "Academic passages that train speed and comprehension.",
    tasks: [
      { name: "Fill in the Blanks", questions: "4-5 questions", time: "~2 min each" },
      { name: "Multiple Choice (Single)", questions: "2-3 questions", time: "~2 min each" },
      { name: "Multiple Choice (Multiple)", questions: "2-3 questions", time: "~3 min each" },
      { name: "Re-order Paragraphs", questions: "2-3 questions", time: "~3 min each" },
      { name: "Reading & Writing FIB", questions: "5-6 questions", time: "~3 min each" },
    ],
  },
  {
    section: "Listening",
    id: "listening",
    icon: Headphones,
    accent: "#D97706",
    tint: "#FFFBEB",
    time: "30-43 min",
    blurb: "Real recordings with dictation practice at exam pace.",
    tasks: [
      { name: "Summarize Spoken Text", questions: "1-2 questions", time: "10 min each" },
      { name: "Multiple Choice (Multiple)", questions: "2-3 questions", time: "~2 min each" },
      { name: "Fill in the Blanks", questions: "2-3 questions", time: "~2 min each" },
      { name: "Highlight Correct Summary", questions: "2-3 questions", time: "~2 min each" },
      { name: "Write from Dictation", questions: "3-4 questions", time: "~1 min each" },
    ],
  },
];

const STATS = [
  { label: "Practice Questions", value: "500+", icon: BookOpen },
  { label: "Active Learners", value: "10K+", icon: Users },
  { label: "Avg Score Improvement", value: "+18pts", icon: TrendingUp },
  { label: "AI Feedback Sessions", value: "50K+", icon: Brain },
];

const FEATURES = [
  {
    id: "scoring",
    icon: Brain,
    title: "Real-Time AI Scoring Engine",
    desc: "Every response is scored in seconds against the official Pearson criteria, with a CEFR-aligned band and criterion-level breakdown.",
    proof: "Scored in under 10 seconds",
  },
  {
    id: "coaching",
    icon: Target,
    title: "Personalized Coaching & Weakness Analysis",
    desc: "The coach ranks your weakest skills, builds a 4-week plan around them, and rebuilds the plan after every session.",
    proof: "A plan rebuilt after every session",
  },
  {
    id: "simulator",
    icon: Shield,
    title: "Full Exam Simulator",
    desc: "Authentic PTE timing, section order, and scoring rules. Know exactly where you stand before test day.",
    proof: "Same timing, same pressure",
  },
  {
    id: "microskills",
    icon: BarChart3,
    title: "Micro-Skills Breakdown",
    desc: "Fluency, pronunciation, grammar, vocabulary, spelling, and written discourse tracked independently across every task you attempt.",
    proof: "6 micro-skills, one trend line",
  },
];

/**
 * Preview definitions for the features split-screen. Each feature renders a
 * distinct mini-dashboard (not just re-badged rows) so switching tabs visibly
 * changes the interface, not merely the labels.
 */
type PreviewRow = { label: string; value: string; bar: number; tone: string };

type FeaturePreview = {
  kind: "scorecard" | "waveform" | "timer" | "trend";
  headline: string;
  metric: string;
  metricLabel: string;
  rows: PreviewRow[];
  /** Extra context line rendered under the rows */
  footnote: string;
};

const FEATURE_PREVIEWS: Record<string, FeaturePreview> = {
  scoring: {
    kind: "scorecard",
    headline: "Scored against the official Pearson criteria",
    metric: "73",
    metricLabel: "Band · C1",
    rows: [
      { label: "Content", value: "8 / 9", bar: 88, tone: "bg-teal-600" },
      { label: "Form", value: "Perfect", bar: 100, tone: "bg-teal-600" },
      { label: "Grammar", value: "7 / 9", bar: 78, tone: "bg-teal-500" },
      { label: "Pronunciation", value: "6 / 9", bar: 66, tone: "bg-amber-500" },
    ],
    footnote: "Feedback includes model answers at bands 65, 79 and 90.",
  },
  coaching: {
    kind: "trend",
    headline: "Your 4-week plan, focused on weak skills",
    metric: "Wk 2",
    metricLabel: "Current focus",
    rows: [
      { label: "Read Aloud", value: "10 / day", bar: 70, tone: "bg-teal-600" },
      { label: "Write Essay", value: "3 / week", bar: 45, tone: "bg-teal-500" },
      { label: "Describe Image", value: "5 / day", bar: 60, tone: "bg-teal-500" },
      { label: "Write from Dictation", value: "8 / day", bar: 80, tone: "bg-amber-500" },
    ],
    footnote: "Weakest skill first: pronunciation drills lead week 2.",
  },
  simulator: {
    kind: "timer",
    headline: "Real timing, real section order, real pressure",
    metric: "3h",
    metricLabel: "Full mock test",
    rows: [
      { label: "Speaking", value: "54-67 min", bar: 90, tone: "bg-teal-600" },
      { label: "Writing", value: "50-60 min", bar: 82, tone: "bg-teal-500" },
      { label: "Reading", value: "32-41 min", bar: 55, tone: "bg-teal-500" },
      { label: "Listening", value: "30-43 min", bar: 60, tone: "bg-teal-600" },
    ],
    footnote: "Scoring rules match the official exam, including partial credit.",
  },
  microskills: {
    kind: "waveform",
    headline: "Fluency, pronunciation and grammar, tracked per task",
    metric: "69",
    metricLabel: "Pronunciation",
    rows: [
      { label: "Oral Fluency", value: "71", bar: 76, tone: "bg-teal-600" },
      { label: "Pronunciation", value: "69", bar: 73, tone: "bg-amber-500" },
      { label: "Grammar", value: "74", bar: 80, tone: "bg-teal-600" },
      { label: "Spelling", value: "80", bar: 87, tone: "bg-teal-500" },
    ],
    footnote: "Word-level feedback pinpoints which sounds drift in Read Aloud.",
  },
};

/** Animated waveform bars for the micro-skills preview. */
function WaveformPreview() {
  const bars = [42, 68, 55, 80, 62, 90, 48, 74, 58, 85, 66, 50, 78, 60, 92, 54, 70, 46, 82, 64];
  return (
    <div
      className="flex h-16 items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-4"
      role="img"
      aria-label="Live waveform of a recorded response"
    >
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="w-1.5 rounded-full bg-teal-600/80"
          initial={{ height: 4 }}
          animate={{ height: [4, Math.round(h * 0.6), 4] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.06, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/** Countdown strip for the exam simulator preview. */
function TimerPreview() {
  const segments = [
    { label: "Speaking", pct: 28 },
    { label: "Writing", pct: 26 },
    { label: "Reading", pct: 22 },
    { label: "Listening", pct: 24 },
  ];
  const tones = ["bg-teal-600", "bg-teal-500", "bg-cyan-600", "bg-cyan-500"];
  return (
    <div
      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
      role="img"
      aria-label="Exam time split across the four sections"
    >
      <div className="flex h-3 overflow-hidden rounded-full">
        {segments.map((s, i) => (
          <span key={s.label} className={tones[i]} style={{ width: `${s.pct}%` }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s, i) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
            <span className={`h-2 w-2 rounded-full ${tones[i]}`} aria-hidden="true" />
            {s.label} · {s.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

const LEARNING_MODES = [
  {
    icon: Play,
    title: "Beginner Mode",
    desc: "Guided templates, model answers, and step-by-step instructions for each task type.",
    badge: "For Starters",
    accent: "#059669",
    tint: "#ECFDF5",
    href: "/learning-modes",
  },
  {
    icon: Clock,
    title: "Exam Mode",
    desc: "Strict timing, no hints, authentic exam conditions. Know exactly where you stand.",
    badge: "Most Realistic",
    accent: "#2563EB",
    tint: "#EFF6FF",
    href: "/mock-test",
  },
  {
    icon: Target,
    title: "Diagnostic Mode",
    desc: "Identify your weakest skills with targeted questions and a detailed skill gap report.",
    badge: "Recommended First",
    accent: "#7C3AED",
    tint: "#F5F3FF",
    href: "/learning-modes",
  },
  {
    icon: RotateCcwIcon,
    title: "Revision Mode",
    desc: "Spaced repetition of your incorrect answers to reinforce learning and fix persistent errors.",
    badge: "High Impact",
    accent: "#D97706",
    tint: "#FFFBEB",
    href: "/revision",
  },
];

const SCORE_BANDS = [
  { range: "79-90", level: "Expert", color: "bg-emerald-500", desc: "C2 Proficient" },
  { range: "65-78", level: "Advanced", color: "bg-blue-500", desc: "C1 Advanced" },
  { range: "51-64", level: "Upper-Intermediate", color: "bg-violet-500", desc: "B2 Upper-Intermediate" },
  { range: "36-50", level: "Intermediate", color: "bg-amber-500", desc: "B1 Intermediate" },
  { range: "10-35", level: "Elementary", color: "bg-red-500", desc: "A1-A2 Elementary" },
];

/* ── Tasks: tabbed exam overview ────────────────────────────────────────── */

function TaskSyllabus({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [activeId, setActiveId] = useState(TASK_TYPES[0].id);
  const active = TASK_TYPES.find((s) => s.id === activeId) ?? TASK_TYPES[0];

  const practiceHref = `/practice/${active.id}`;

  return (
    <section id="tasks" className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            The full PTE Academic syllabus
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            All 20 official task types across four sections. Pick a section to
            see every task, its question count, and the time it takes in the
            real exam.
          </p>
        </div>

        <div className={`overflow-hidden ${DESIGN_CARD} shadow-xl`}>
          {/* Tab bar */}
          <div
            role="tablist"
            aria-label="Exam sections"
            className="grid grid-cols-2 gap-2 border-b border-gray-200 bg-gray-50 p-2 sm:grid-cols-4"
          >
            {TASK_TYPES.map((section) => {
              const isActive = section.id === activeId;
              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  id={`exam-tab-${section.id}`}
                  aria-selected={isActive}
                  aria-controls={`exam-panel-${section.id}`}
                  onClick={() => setActiveId(section.id)}
                  className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                    isActive
                      ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                      : "text-gray-500 hover:bg-white/70 hover:text-gray-800"
                  }`}
                >
                  <section.icon
                    className={`h-4 w-4 ${isActive ? "" : "text-gray-400"}`}
                    style={isActive ? { color: section.accent } : undefined}
                    aria-hidden="true"
                  />
                  {section.section}
                </button>
              );
            })}
          </div>

          {/* Panel */}
          <div
            role="tabpanel"
            id={`exam-panel-${active.id}`}
            aria-labelledby={`exam-tab-${active.id}`}
            tabIndex={0}
            className="p-6 sm:p-8"
          >
            {/* Section summary strip */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: active.tint }}
                aria-hidden="true"
              >
                <active.icon className="h-5 w-5" style={{ color: active.accent }} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-semibold text-gray-900">
                  {active.section}
                </h3>
                <p className="text-sm text-muted-foreground">{active.blurb}</p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                  {active.tasks.length} task{active.tasks.length > 1 ? "s" : ""}
                </span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                  {active.time}
                </span>
              </div>
            </div>

            {/* Task list: high-density table with per-task metadata */}
            <ol className="overflow-hidden rounded-xl border border-gray-200">
              {active.tasks.map((task, i) => (
                <li
                  key={task.name}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors duration-150 hover:bg-gray-50 sm:px-5 ${
                    i > 0 ? "border-t border-gray-100" : ""
                  }`}
                >
                  <span
                    className="font-display w-7 shrink-0 text-xs font-bold tabular-nums"
                    style={{ color: active.accent }}
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">
                    {task.name}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                    {task.questions}
                  </span>
                  <span className="text-xs font-medium tabular-nums text-gray-500">
                    {task.time}
                  </span>
                  {isAuthenticated ? (
                    <Link
                      href={practiceHref}
                      className="inline-flex items-center gap-1 rounded-lg text-xs font-semibold transition-colors"
                      style={{ color: active.accent }}
                    >
                      Practice
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ) : (
                    <a
                      href={getLoginUrl()}
                      className="inline-flex items-center gap-1 rounded-lg text-xs font-semibold transition-colors"
                      style={{ color: active.accent }}
                    >
                      Practice
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Features: split-screen with sticky narrative + interactive preview ───── */

const DESIGN_CARD = "rounded-2xl border border-gray-200 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]";

function FeaturesSplit() {
  const [activeId, setActiveId] = useState(FEATURES[0].id);
  const active = FEATURES.find((f) => f.id === activeId) ?? FEATURES[0];
  const preview = FEATURE_PREVIEWS[active.id];

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-12 max-w-2xl">
          <div className="mb-4 flex items-center gap-4" aria-hidden="true">
            <span className="h-px w-12 bg-teal-600" />
            <span className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
              Why PTEMaster
            </span>
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything You Need to Succeed
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Four capabilities working together: calibrated AI scoring, coaching
            that adapts, and analytics that show exactly where the next points
            come from.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* ── Left: sticky feature navigation (click or hover to activate) ── */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div
              role="tablist"
              aria-label="Platform features"
              aria-orientation="vertical"
              className={`divide-y divide-gray-100 p-2 sm:p-4 ${DESIGN_CARD} shadow-xl`}
            >
              {FEATURES.map((f) => {
                const isActive = f.id === activeId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    id={`feature-tab-${f.id}`}
                    aria-selected={isActive}
                    aria-controls="feature-preview-panel"
                    onClick={() => setActiveId(f.id)}
                    onMouseEnter={() => setActiveId(f.id)}
                    className={`w-full rounded-xl px-4 py-5 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                      isActive ? "bg-teal-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                          isActive ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500"
                        }`}
                        aria-hidden="true"
                      >
                        <f.icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3
                          className={`font-display text-base font-semibold transition-colors duration-200 ${
                            isActive ? "text-teal-900" : "text-gray-900"
                          }`}
                        >
                          {f.title}
                        </h3>
                        <p className="mt-0.5 text-xs font-semibold text-teal-700">{f.proof}</p>
                      </div>
                      <ChevronRight
                        className={`ml-auto h-4 w-4 shrink-0 transition-all duration-200 ${
                          isActive
                            ? "translate-x-0 text-teal-700 opacity-100"
                            : "-translate-x-1 text-gray-300 opacity-0"
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: framed interactive preview — swaps with the active tab ── */}
          <div>
            <div
              id="feature-preview-panel"
              role="tabpanel"
              aria-labelledby={`feature-tab-${active.id}`}
              tabIndex={0}
              className={`overflow-hidden ${DESIGN_CARD} shadow-xl transition-shadow duration-300`}
            >
              {/* Preview header in brand teal, mirroring the hero report */}
              <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 px-6 py-6 sm:px-8">
                <span className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" aria-hidden="true" />
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-50/90">
                      {active.title}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold text-white">
                      {preview.headline}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-white/95 px-4 py-3 text-center shadow-lg">
                    <p className="font-display text-2xl font-bold leading-none text-teal-800 tabular-nums">
                      {preview.metric}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      {preview.metricLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {/* Distinct interface per feature: waveform for micro-skills,
                    time-split for the simulator, scored rows otherwise */}
                {preview.kind === "waveform" && <WaveformPreview />}
                {preview.kind === "timer" && <TimerPreview />}

                <ul
                  className={`space-y-4 ${
                    preview.kind === "waveform" || preview.kind === "timer" ? "mt-6" : ""
                  }`}
                  aria-label={`${active.title} data`}
                >
                  {preview.rows.map((row) => (
                    <li key={row.label}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-800">{row.label}</span>
                        <span className="text-xs font-bold tabular-nums text-gray-900">{row.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100" role="presentation">
                        <motion.div
                          className={`h-full rounded-full ${row.tone}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${row.bar}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="mt-6 flex items-start gap-2 rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden="true" />
                  {preview.footnote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* -- Top Navigation -- */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900">PTE<span className="text-teal-600">Master</span></span>
            </div>

            {/* Nav Links: pages for every destination (mobile: hidden, use footer links) */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/features" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">Features</Link>
              <Link href="/exam-structure" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">Exam Structure</Link>
              <Link href="/score-guide" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">Score Guide</Link>
              <Link href="/pricing" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">Pricing</Link>
            </div>

            {/* Auth */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <button className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              ) : (
                <>
                  <a href={getLoginUrl()} className="text-sm text-gray-600 hover:text-teal-600 transition-colors font-medium">
                    Sign In
                  </a>
                  <a href={getLoginUrl()} className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    Start Free
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* -- Hero Section -- */}
      <HeroSection />

      {/* -- Stats Bar -- */}
      <section className="bg-teal-600 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {STATS.map(s => (
              <motion.div
                key={s.label}
                className="text-center"
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.5 }}
              >
                <s.icon className="w-6 h-6 text-teal-200 mx-auto mb-2" />
                <p className="text-3xl font-extrabold text-white">{s.value}</p>
                <p className="text-teal-200 text-sm">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* -- Task Types Section: syllabus accordion -- */}
      <TaskSyllabus isAuthenticated={isAuthenticated} />

      {/* -- Features Section: split screen — sticky narrative + live preview -- */}
      <FeaturesSplit />

      {/* -- Score Guide Section -- */}
      <section id="scores" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Understand Your PTE Score</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                PTE Academic scores range from 10 to 90. Each score band corresponds to a CEFR level and is accepted by universities, governments, and employers worldwide.
              </p>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Our AI scoring engine evaluates your responses against the same criteria Pearson uses — giving you a realistic preview of your actual exam score before test day.
              </p>
              {isAuthenticated ? (
                <Link href="/practice" className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                  Get Your Score Estimate
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <a href={getLoginUrl()} className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                  Get Your Score Estimate
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>

            <div className="space-y-3">
              {SCORE_BANDS.map(band => (
                <div key={band.range} className={`flex items-center gap-4 p-4 ${DESIGN_CARD}`}>
                  <div className={`w-14 h-14 ${band.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white font-bold text-sm">{band.range}</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{band.level}</p>
                    <p className="text-sm text-gray-500">{band.desc}</p>
                  </div>
                  <div className="ml-auto">
                    <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${band.color} rounded-full`}
                        style={{ width: band.range === "79-90" ? "100%" : band.range === "65-78" ? "80%" : band.range === "51-64" ? "60%" : band.range === "36-50" ? "40%" : "20%" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -- Learning Modes -- */}
      {/* -- Learning Modes Section -- */}
      <section id="modes" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-2xl">
            <div className="mb-4 flex items-center gap-4" aria-hidden="true">
              <span className="h-px w-12 bg-teal-600" />
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
                Learning Modes
              </span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Four Ways to Practice
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Choose the mode that fits your study goal today. Every mode scores
              with the same engine, so your analytics stay comparable.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {LEARNING_MODES.map(mode => (
              <div
                key={mode.title}
                className={`group p-6 transition-all duration-200 hover:border-teal-300 hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.15)] ${DESIGN_CARD}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: mode.tint }}
                    aria-hidden="true"
                  >
                    <mode.icon className="h-5 w-5" style={{ color: mode.accent }} />
                  </span>
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: mode.tint, color: mode.accent }}>
                    {mode.badge}
                  </span>
                </div>
                <h3 className="font-display mt-5 text-base font-semibold text-gray-900">
                  {mode.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{mode.desc}</p>
                {isAuthenticated ? (
                  <Link href={mode.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors" style={{ color: mode.accent }}>
                    Open {mode.title}
                    <ChevronRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                ) : (
                  <a href={getLoginUrl()} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors" style={{ color: mode.accent }}>
                    Open {mode.title}
                    <ChevronRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- CTA Section -- */}
      <section className="py-20 bg-gradient-to-br from-teal-600 to-cyan-700">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Trophy className="w-12 h-12 text-yellow-300 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Hit Your Target Score?</h2>
          <p className="text-teal-100 mb-8 text-lg">
            Join thousands of PTE candidates who improved their scores with AI-powered practice. Start free today — no credit card required.
          </p>
          {isAuthenticated ? (
            <Link
              href="/practice"
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-teal-700 font-bold px-8 py-4 rounded-xl transition-colors shadow-xl text-lg"
            >
              <Play className="w-5 h-5 fill-teal-600 text-teal-600" />
              Start Practicing
            </Link>
          ) : (
            <a
              href={getLoginUrl()}
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-teal-700 font-bold px-8 py-4 rounded-xl transition-colors shadow-xl text-lg"
            >
              <Play className="w-5 h-5 fill-teal-600 text-teal-600" />
              Start Practicing Free
            </a>
          )}
          <p className="text-teal-200 text-sm mt-4">500+ practice questions · AI scoring · Personalized coaching</p>
        </div>
      </section>

      {/* -- Footer -- */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">P</span>
                </div>
                <span className="text-white font-bold">PTEMaster</span>
              </div>
              <p className="text-sm leading-relaxed">AI-powered PTE Academic preparation platform aligned with official Pearson scoring criteria.</p>
            </div>
            {[
              {
                title: "Practice",
                links: [
                  { label: "Speaking", href: "/practice/speaking" },
                  { label: "Writing", href: "/practice/writing" },
                  { label: "Reading", href: "/practice/reading" },
                  { label: "Listening", href: "/practice/listening" },
                  { label: "Mock Test", href: "/mock-test" },
                ],
              },
              {
                title: "Resources",
                links: [
                  { label: "Score Guide", href: "/score-guide" },
                  { label: "Exam Structure", href: "/exam-structure" },
                  { label: "Features", href: "/features" },
                  { label: "Pricing", href: "/pricing" },
                ],
              },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-white font-semibold mb-4 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm hover:text-teal-400 transition-colors">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© 2025 PTEMaster. Not affiliated with Pearson Education Ltd. PTE Academic™ is a trademark of Pearson Education Ltd.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
