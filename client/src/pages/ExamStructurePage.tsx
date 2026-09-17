/**
 * Exam Structure page — the full PTE Academic syllabus as a standalone,
 * deep-linkable page. Reuses the task-type dataset shape from Home but is
 * self-contained so it can grow independently (per-task tips, samples).
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  BookOpen, Headphones, Mic, PenLine, ArrowRight, ChevronRight, Clock, HelpCircle, ListChecks,
} from "lucide-react";

const DESIGN_CARD =
  "rounded-2xl border border-gray-200 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]";

const SECTIONS = [
  {
    id: "speaking",
    section: "Speaking",
    icon: Mic,
    accent: "#EF5350",
    tint: "#FEF2F2",
    time: "54-67 min",
    blurb:
      "The speaking section opens the exam and runs on a personal recorder. Responses are scored on content, oral fluency, and pronunciation, and speaking skills also feed your Reading and Listening scores through integrated tasks.",
    tasks: [
      { name: "Read Aloud", questions: "6-7 questions", time: "~40s each", tip: "Text appears for 30-40 seconds before recording starts. Use it to rehearse stress and chunking." },
      { name: "Repeat Sentence", questions: "10-12 questions", time: "~40s each", tip: "Audio plays once with no replay. Capture meaning and rhythm rather than isolated words." },
      { name: "Describe Image", questions: "6-7 questions", time: "~40s each", tip: "25 seconds to prepare. Follow a fixed template: intro, key trend, comparison, conclusion." },
      { name: "Re-tell Lecture", questions: "3-4 questions", time: "~90s each", tip: "Note-taking is allowed. Structure the retelling as situation, development, and outcome." },
      { name: "Answer Short Question", questions: "5-6 questions", time: "~20s each", tip: "One or a few words is enough. Silence after three seconds moves the task on." },
    ],
  },
  {
    id: "writing",
    section: "Writing",
    icon: PenLine,
    accent: "#7C3AED",
    tint: "#F5F3FF",
    time: "50-60 min",
    blurb:
      "Two task types scored on content, form, grammar, vocabulary, spelling, and written discourse. Because writing contributes to Reading as well, spelling and structure carry double weight.",
    tasks: [
      { name: "Summarize Written Text", questions: "2-3 questions", time: "10 min each", tip: "One sentence only, 5-75 words. Prioritize the main idea over supporting detail." },
      { name: "Write Essay", questions: "1-2 questions", time: "20 min each", tip: "200-300 words with a clear position. Leave two minutes to check spelling and punctuation." },
    ],
  },
  {
    id: "reading",
    section: "Reading",
    icon: BookOpen,
    accent: "#059669",
    tint: "#ECFDF5",
    time: "32-41 min",
    blurb:
      "A single timed section shared across all reading tasks, so time management is part of the skill. Academic passages cover sciences, humanities, and everyday contexts.",
    tasks: [
      { name: "Fill in the Blanks", questions: "4-5 questions", time: "~2 min each", tip: "Collocation knowledge decides most answers. Read the full sentence before choosing." },
      { name: "Multiple Choice (Single)", questions: "2-3 questions", time: "~2 min each", tip: "Scan the question stem first, then read for the specific detail it asks about." },
      { name: "Multiple Choice (Multiple)", questions: "2-3 questions", time: "~3 min each", tip: "Wrong options subtract marks. Only select choices you can justify from the text." },
      { name: "Re-order Paragraphs", questions: "2-3 questions", time: "~3 min each", tip: "Anchor on the standalone topic sentence, then chain pronouns and linking words." },
      { name: "Reading & Writing FIB", questions: "5-6 questions", time: "~3 min each", tip: "A drop-down variant that also scores writing. Grammar fit matters as much as meaning." },
    ],
  },
  {
    id: "listening",
    section: "Listening",
    icon: Headphones,
    accent: "#D97706",
    tint: "#FFFBEB",
    time: "30-43 min",
    blurb:
      "Audio plays once for most listening tasks. Write from Dictation is the highest-weighted task on the exam, contributing to both Listening and Writing scores.",
    tasks: [
      { name: "Summarize Spoken Text", questions: "1-2 questions", time: "10 min each", tip: "50-70 words covering the speaker's main points. Notes during playback are essential." },
      { name: "Multiple Choice (Multiple)", questions: "2-3 questions", time: "~2 min each", tip: "Options are paraphrased, so match meaning rather than identical words." },
      { name: "Fill in the Blanks", questions: "2-3 questions", time: "~2 min each", tip: "Type as you hear. Watch plurals and verb endings - spelling counts." },
      { name: "Highlight Correct Summary", questions: "2-3 questions", time: "~2 min each", tip: "Eliminate summaries that add claims the speaker never made." },
      { name: "Write from Dictation", questions: "3-4 questions", time: "~1 min each", tip: "Every correct word earns a mark. Type immediately, then re-check each sentence." },
    ],
  },
];

const QUICK_FACTS = [
  { icon: ListChecks, label: "20 task types", value: "Across four sections" },
  { icon: Clock, label: "About 2 hours", value: "Single-sitting computer exam" },
  { icon: HelpCircle, label: "10-90 scale", value: "Scored, aligned to CEFR" },
];

export default function ExamStructurePage() {
  const { isAuthenticated } = useAuth();
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center" aria-hidden="true">
                <span className="text-white font-bold text-sm">P</span>
              </span>
              <span className="text-xl font-bold text-gray-900">
                PTE<span className="text-teal-600">Master</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/features" className="text-gray-600 hover:text-teal-600 transition-colors">Features</Link>
              <Link href="/exam-structure" className="font-semibold text-teal-700" aria-current="page">Exam Structure</Link>
              <Link href="/score-guide" className="text-gray-600 hover:text-teal-600 transition-colors">Score Guide</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-teal-600 transition-colors">Pricing</Link>
            </div>
            {isAuthenticated ? (
              <Link href="/practice" className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Practice Now <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : (
              <a href={getLoginUrl()} className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Start Free
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Page hero */}
      <header className="py-16 lg:py-20 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-4" aria-hidden="true">
            <span className="h-px w-12 bg-teal-600" />
            <span className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">Exam Structure</span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Every task in the real exam, one place
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            PTE Academic has 20 task types across four sections, each with its
            own timing and scoring rules. Below is the complete syllabus with
            what each task measures and how to approach it.
          </p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            {QUICK_FACTS.map((f) => (
              <div key={f.label} className={`flex items-center gap-3 p-4 ${DESIGN_CARD}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50" aria-hidden="true">
                  <f.icon className="h-5 w-5 text-teal-700" />
                </span>
                <div>
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="text-sm font-semibold text-gray-900">{f.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* Section tabs + task table */}
      <section className="py-16 bg-gray-50" aria-label="Task types by section">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`overflow-hidden ${DESIGN_CARD} shadow-xl`}>
            <div
              role="tablist"
              aria-label="Exam sections"
              className="grid grid-cols-2 gap-2 border-b border-gray-200 bg-gray-50 p-2 sm:grid-cols-4"
            >
              {SECTIONS.map((s) => {
                const isActive = s.id === activeId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    id={`exam-page-tab-${s.id}`}
                    aria-selected={isActive}
                    aria-controls={`exam-page-panel-${s.id}`}
                    onClick={() => setActiveId(s.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                      isActive
                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                        : "text-gray-500 hover:bg-white/70 hover:text-gray-800"
                    }`}
                  >
                    <s.icon
                      className={`h-4 w-4 ${isActive ? "" : "text-gray-400"}`}
                      style={isActive ? { color: s.accent } : undefined}
                      aria-hidden="true"
                    />
                    {s.section}
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              id={`exam-page-panel-${active.id}`}
              aria-labelledby={`exam-page-tab-${active.id}`}
              tabIndex={0}
              className="p-6 sm:p-8"
            >
              {/* Summary strip */}
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: active.tint }}
                  aria-hidden="true"
                >
                  <active.icon className="h-5 w-5" style={{ color: active.accent }} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold text-gray-900">{active.section}</h2>
                  <p className="text-sm text-muted-foreground">{active.time} in the real exam</p>
                </div>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                  {active.tasks.length} task{active.tasks.length > 1 ? "s" : ""}
                </span>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-gray-700">{active.blurb}</p>

              {/* Task cards with tips */}
              <div className="space-y-4">
                {active.tasks.map((task, i) => (
                  <div key={task.name} className="rounded-xl border border-gray-200 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span
                        className="font-display w-7 shrink-0 text-xs font-bold tabular-nums"
                        style={{ color: active.accent }}
                        aria-hidden="true"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="min-w-0 flex-1 text-sm font-semibold text-gray-900">{task.name}</h3>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                        {task.questions}
                      </span>
                      <span className="text-xs font-medium tabular-nums text-gray-500">{task.time}</span>
                    </div>
                    <p className="mt-2.5 pl-10 text-sm leading-relaxed text-gray-600">{task.tip}</p>
                  </div>
                ))}
              </div>

              {isAuthenticated ? (
                <Link
                  href={`/practice/${active.id}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                  style={{ color: active.accent }}
                >
                  Practice {active.section} now
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <a
                  href={getLoginUrl()}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                  style={{ color: active.accent }}
                >
                  Sign in to practice {active.section}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cross-links */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">Explore more:</p>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/features" className="hover:text-teal-400 transition-colors">Features</Link>
            <Link href="/score-guide" className="hover:text-teal-400 transition-colors">Score Guide</Link>
            <Link href="/pricing" className="hover:text-teal-400 transition-colors">Pricing</Link>
            <Link href="/" className="hover:text-teal-400 transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
