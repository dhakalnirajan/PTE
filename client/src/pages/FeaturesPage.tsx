/**
 * Features page — public overview of the platform's core capabilities.
 * Shares the visual language of the redesigned Home sections: Sora display
 * headings, editorial left-aligned headers with teal rules, DESIGN_CARD
 * containers, and 8px spacing rhythm.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  Brain, Target, Shield, BarChart3, Mic, Headphones, PenLine, BookOpen,
  Clock, TrendingUp, ArrowRight, CheckCircle2, ChevronRight, Zap,
} from "lucide-react";
import { useState } from "react";

const DESIGN_CARD =
  "rounded-2xl border border-gray-200 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]";

const CORE_FEATURES = [
  {
    id: "scoring",
    icon: Brain,
    accent: "#0F766E",
    tint: "#F0FDFA",
    title: "Real-Time AI Scoring Engine",
    tagline: "Your responses scored in seconds, not days",
    paragraphs: [
      "Every answer you give is evaluated against the same criteria Pearson uses to score the real exam: content, form, grammar, vocabulary, spelling, pronunciation, oral fluency, and written discourse.",
      "Scores arrive in under 10 seconds with a CEFR-aligned band and a criterion-level breakdown, so you always know which part of an answer earned the points and which part cost them.",
      "Model answers at bands 65, 79 and 90 accompany every scored task, giving you a concrete target to rewrite or re-speak against.",
    ],
    proof: [
      "Criterion-level feedback on all 20 task types",
      "CEFR-aligned bands from A2 to C2",
      "Model answers at every target band",
    ],
  },
  {
    id: "coaching",
    icon: Target,
    accent: "#7C3AED",
    tint: "#F5F3FF",
    title: "Personalized Coaching & Weakness Analysis",
    tagline: "A study plan that rebuilds itself after every session",
    paragraphs: [
      "After each practice session the coach re-ranks your skills, identifies the two or three that are costing you the most points, and rebuilds your plan around them.",
      "Plans are structured week by week with daily task quotas matched to your availability, and they update automatically as your weak spots move.",
      "Instead of grinding every task type equally, you spend your study hours where the data says the points are.",
    ],
    proof: [
      "4-week adaptive coaching plan",
      "Daily task quotas sized to your schedule",
      "Automatic re-planning after every session",
    ],
  },
  {
    id: "simulator",
    icon: Shield,
    accent: "#2563EB",
    tint: "#EFF6FF",
    title: "Full Exam Simulator",
    tagline: "Know exactly where you stand before test day",
    paragraphs: [
      "The mock test reproduces the real PTE Academic experience: the same section order, the same task mix, and the same strict per-task timing, with no hints and no pauses.",
      "At the end you receive a full score report on the 10-90 scale with the same communicative and enabling skill breakdown the real exam produces.",
      "Simulating the pressure in advance means the real exam feels like a rehearsal, not a debut.",
    ],
    proof: [
      "Authentic section order and task mix",
      "Strict official timing per task",
      "Full 10-90 score report on completion",
    ],
  },
  {
    id: "microskills",
    icon: BarChart3,
    accent: "#D97706",
    tint: "#FFFBEB",
    title: "Micro-Skills Breakdown",
    tagline: "Six enabling skills, one clear trend line",
    paragraphs: [
      "Fluency, pronunciation, grammar, vocabulary, spelling, and written discourse are tracked independently across every task you attempt.",
      "Trend lines show whether a skill is genuinely improving or just oscillating, and which task types are doing the work.",
      "The analytics view connects every score change back to the specific practice that produced it, so your effort stays directed.",
    ],
    proof: [
      "Six micro-skills tracked per response",
      "Longitudinal trend analytics",
      "Per-task-type contribution analysis",
    ],
  },
];

const SKILL_SECTIONS = [
  { icon: Mic, label: "Speaking", desc: "Read Aloud, Repeat Sentence, Describe Image, Re-tell Lecture, Answer Short Question." },
  { icon: PenLine, label: "Writing", desc: "Summarize Written Text and Write Essay with grammar and vocabulary feedback." },
  { icon: BookOpen, label: "Reading", desc: "Fill in the Blanks, Multiple Choice, and Re-order Paragraphs under real timing." },
  { icon: Headphones, label: "Listening", desc: "Summarize Spoken Text, dictation, and comprehension at exam pace." },
];

export default function FeaturesPage() {
  const { isAuthenticated } = useAuth();
  const [activeId, setActiveId] = useState(CORE_FEATURES[0].id);
  const active = CORE_FEATURES.find((f) => f.id === activeId) ?? CORE_FEATURES[0];

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
              <Link href="/features" className="font-semibold text-teal-700" aria-current="page">Features</Link>
              <Link href="/exam-structure" className="text-gray-600 hover:text-teal-600 transition-colors">Exam Structure</Link>
              <Link href="/score-guide" className="text-gray-600 hover:text-teal-600 transition-colors">Score Guide</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-teal-600 transition-colors">Pricing</Link>
            </div>
            {isAuthenticated ? (
              <Link href="/dashboard" className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Dashboard <ArrowRight className="w-4 h-4" aria-hidden="true" />
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
            <span className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">Features</span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            What makes practice actually raise your score
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            PTEMaster combines calibrated AI scoring, adaptive coaching, an
            authentic exam simulator, and micro-skill analytics. Each one is
            described below, with what it measures and how it feeds your
            preparation.
          </p>
        </div>
      </header>

      {/* Split: sticky feature nav + detail panel */}
      <section className="py-16 bg-gray-50" aria-label="Core features in detail">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-12">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div
                role="tablist"
                aria-label="Core features"
                aria-orientation="vertical"
                className={`divide-y divide-gray-100 ${DESIGN_CARD}`}
              >
                {CORE_FEATURES.map((f) => {
                  const isActive = f.id === activeId;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      role="tab"
                      id={`feat-page-tab-${f.id}`}
                      aria-selected={isActive}
                      aria-controls={`feat-page-panel-${f.id}`}
                      onClick={() => setActiveId(f.id)}
                      className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-all duration-200 first:rounded-t-2xl last:rounded-b-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                        isActive ? "bg-teal-50/70" : "hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: f.tint }}
                        aria-hidden="true"
                      >
                        <f.icon className="h-5 w-5" style={{ color: f.accent }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-semibold ${isActive ? "text-gray-900" : "text-gray-700"}`}>
                          {f.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {f.tagline}
                        </span>
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-all duration-200 ${isActive ? "text-teal-700 opacity-100" : "text-gray-300 opacity-0"}`}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              role="tabpanel"
              id={`feat-page-panel-${active.id}`}
              aria-labelledby={`feat-page-tab-${active.id}`}
              tabIndex={0}
              className={`p-6 sm:p-8 ${DESIGN_CARD}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: active.tint }}
                  aria-hidden="true"
                >
                  <active.icon className="h-6 w-6" style={{ color: active.accent }} />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-gray-900">
                    {active.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{active.tagline}</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {active.paragraphs.map((p, i) => (
                  <p key={i} className="leading-relaxed text-gray-700">{p}</p>
                ))}
              </div>

              <ul className="mt-8 space-y-3 border-t border-gray-100 pt-6">
                {active.proof.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm font-medium text-gray-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              {isAuthenticated ? (
                <Link
                  href="/practice"
                  className="mt-8 inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Try it in practice <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              ) : (
                <a
                  href={getLoginUrl()}
                  className="mt-8 inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Start Practicing Free <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Coverage strip */}
      <section className="py-16 bg-white" aria-label="Task coverage">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <div className="mb-4 flex items-center gap-4" aria-hidden="true">
              <span className="h-px w-12 bg-teal-600" />
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">Coverage</span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-gray-900">
              Every section of the exam, scored end to end
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SKILL_SECTIONS.map((s) => (
              <div key={s.label} className={`p-6 ${DESIGN_CARD}`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50" aria-hidden="true">
                  <s.icon className="h-5 w-5 text-teal-700" />
                </span>
                <h3 className="font-display mt-4 text-base font-semibold text-gray-900">{s.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className={`mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 p-6 ${DESIGN_CARD}`}>
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Zap className="h-4 w-4 text-teal-700" aria-hidden="true" /> Feedback in under 10 seconds
            </span>
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Clock className="h-4 w-4 text-teal-700" aria-hidden="true" /> Official task timing throughout
            </span>
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <TrendingUp className="h-4 w-4 text-teal-700" aria-hidden="true" /> Analytics on every attempt
            </span>
          </div>
        </div>
      </section>

      {/* Cross-links */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">Explore more:</p>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/exam-structure" className="hover:text-teal-400 transition-colors">Exam Structure</Link>
            <Link href="/score-guide" className="hover:text-teal-400 transition-colors">Score Guide</Link>
            <Link href="/pricing" className="hover:text-teal-400 transition-colors">Pricing</Link>
            <Link href="/" className="hover:text-teal-400 transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
