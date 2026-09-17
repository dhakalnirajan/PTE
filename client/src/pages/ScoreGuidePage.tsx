/**
 * Score Guide page — explains the PTE Academic 10-90 scale, CEFR alignment,
 * band descriptions, and how the platform's AI estimate relates to the real
 * exam score.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  ArrowRight, Brain, CheckCircle2, GraduationCap, Landmark, Briefcase, TrendingUp,
} from "lucide-react";

const DESIGN_CARD =
  "rounded-2xl border border-gray-200 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]";

const BANDS = [
  {
    range: "79-90", level: "Expert", cefr: "C2", color: "bg-emerald-500", soft: "#ECFDF5",
    width: 100,
    desc: "Full operational command of the language. Understands virtually everything read or heard and expresses ideas fluently and precisely.",
    use: "Required by top-ranked universities, specialist registration boards, and premium visa categories.",
  },
  {
    range: "65-78", level: "Advanced", cefr: "C1", color: "bg-blue-500", soft: "#EFF6FF",
    width: 80,
    desc: "Flexible and effective use of language in academic and professional contexts, with only occasional imprecision.",
    use: "The most common requirement for university admission and skilled-migration visas, including Australia's 65-point benchmark.",
  },
  {
    range: "51-64", level: "Upper-Intermediate", cefr: "B2", color: "bg-violet-500", soft: "#F5F3FF",
    width: 60,
    desc: "Reliable command with good range of vocabulary and structure; handles complex language well in familiar situations.",
    use: "Accepted by many universities, professional programs, and standard work-visa streams.",
  },
  {
    range: "36-50", level: "Intermediate", cefr: "B1", color: "bg-amber-500", soft: "#FFF8EC",
    width: 40,
    desc: "Can deal with most situations encountered in study or travel and produce connected text on familiar topics.",
    use: "Meets foundation and pathway program requirements and some employer benchmarks.",
  },
  {
    range: "10-35", level: "Elementary", cefr: "A1-A2", color: "bg-red-500", soft: "#FEF2F2",
    width: 20,
    desc: "Basic command: understands familiar, everyday expressions and communicates in simple, routine tasks.",
    use: "Indicates preparation is needed before attempting exam-dependent applications.",
  },
];

const ACCEPTORS = [
  { icon: GraduationCap, title: "Universities", desc: "Undergraduate and postgraduate admissions across the UK, Australia, New Zealand, Canada, and Ireland." },
  { icon: Landmark, title: "Governments", desc: "Visa and immigration programs, including Australia and New Zealand skilled migration." },
  { icon: Briefcase, title: "Employers", desc: "Professional registration bodies and multinational employers assessing workplace English." },
];

const HOW_SCORED = [
  "Every response is scored against Pearson's published criteria: content, form, grammar, vocabulary, spelling, pronunciation, oral fluency, and written discourse.",
  "Tasks are integrated: a Read Aloud response feeds both Speaking and Reading, and Write from Dictation feeds both Listening and Writing.",
  "Each of the four communicative skills (Speaking, Writing, Reading, Listening) is reported on the 10-90 scale, alongside the six enabling skills.",
  "The overall score is not a simple average - it is computed from all task contributions across the exam.",
];

export default function ScoreGuidePage() {
  const { isAuthenticated } = useAuth();

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
              <Link href="/exam-structure" className="text-gray-600 hover:text-teal-600 transition-colors">Exam Structure</Link>
              <Link href="/score-guide" className="font-semibold text-teal-700" aria-current="page">Score Guide</Link>
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
            <span className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">Score Guide</span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Understand the PTE Academic score
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            PTE Academic reports on a 10-90 scale aligned to the CEFR. Below is
            what each band means, who accepts it, and how our AI estimate maps
            to the real exam.
          </p>
        </div>
      </header>

      {/* Band table */}
      <section className="py-16 bg-gray-50" aria-label="Score bands">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 mb-6">
            Score bands, 10 to 90
          </h2>
          <ol className="space-y-4">
            {BANDS.map((band) => (
              <li key={band.range} className={`p-6 ${DESIGN_CARD}`}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className={`w-16 h-16 ${band.color} rounded-xl flex items-center justify-center shrink-0`} aria-hidden="true">
                    <span className="text-white font-bold text-sm">{band.range}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <h3 className="font-display text-lg font-semibold text-gray-900">{band.level}</h3>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ backgroundColor: band.soft, color: "currentColor" }}>
                        CEFR {band.cefr}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">{band.desc}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100" role="presentation">
                  <div className={`h-full ${band.color} rounded-full`} style={{ width: `${band.width}%` }} />
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">Typically required for:</span> {band.use}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Who accepts PTE */}
      <section className="py-16 bg-white" aria-label="Who accepts PTE Academic">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <div className="mb-4 flex items-center gap-4" aria-hidden="true">
              <span className="h-px w-12 bg-teal-600" />
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">Acceptance</span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-gray-900">
              Who accepts PTE Academic
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {ACCEPTORS.map((a) => (
              <div key={a.title} className={`p-6 ${DESIGN_CARD}`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50" aria-hidden="true">
                  <a.icon className="h-5 w-5 text-teal-700" />
                </span>
                <h3 className="font-display mt-4 text-base font-semibold text-gray-900">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How scoring works */}
      <section className="py-16 bg-gray-50" aria-label="How scoring works">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-gray-900">
              How the score is calculated
            </h2>
            <ul className="mt-6 space-y-4">
              {HOW_SCORED.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className={`p-6 sm:p-8 ${DESIGN_CARD}`}>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50" aria-hidden="true">
                <Brain className="h-6 w-6 text-teal-700" />
              </span>
              <h3 className="font-display text-lg font-semibold text-gray-900">
                Our AI estimate
              </h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-700">
              The scoring engine evaluates your practice responses against the
              same criteria Pearson uses, on the same 10-90 scale. A mock test
              score of 72 on PTEMaster reflects how the same responses would be
              scored on the real exam - which makes it a realistic preview of
              your result before test day.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gray-700">
              The estimate is strongest when your practice mirrors exam
              conditions: use the Exam Simulator for the most faithful
              prediction.
            </p>
            {isAuthenticated ? (
              <Link href="/mock-test" className="mt-6 inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                Take a mock test <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : (
              <a href={getLoginUrl()} className="mt-6 inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                Get your score estimate <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Improvement CTA */}
      <section className="py-16 bg-white" aria-label="Improve your band">
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 p-8 flex flex-wrap items-center gap-6 ${DESIGN_CARD}`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50" aria-hidden="true">
            <TrendingUp className="h-6 w-6 text-teal-700" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold tracking-tight text-gray-900">
              Not at your target band yet?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The coaching plan finds the tasks and micro-skills that move your
              band fastest, and rebuilds itself after every session.
            </p>
          </div>
          {isAuthenticated ? (
            <Link href="/coaching-plan" className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              View your plan <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          ) : (
            <a href={getLoginUrl()} className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              Start Practicing Free <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </section>

      {/* Cross-links */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">Explore more:</p>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/features" className="hover:text-teal-400 transition-colors">Features</Link>
            <Link href="/exam-structure" className="hover:text-teal-400 transition-colors">Exam Structure</Link>
            <Link href="/pricing" className="hover:text-teal-400 transition-colors">Pricing</Link>
            <Link href="/" className="hover:text-teal-400 transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
