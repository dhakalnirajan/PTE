/**
 * Hero Section — PTEMaster landing page
 *
 * Design decisions (per the redesign brief):
 * - Single focal point: one primary CTA. The target-score picker lives in the
 *   onboarding flow, not the hero.
 * - No pill badge above the headline, no gradient text fills, no glassmorphism.
 * - Typography pair: Sora (geometric display) for headings, Inter for body.
 * - Strict 8px spacing rhythm (p-4/6/8, gap-4/6/8, mb-6/8/12).
 * - The score card sits inside a grounded "dashboard preview" frame with a
 *   browser chrome bar, layered borders, and intentional elevation.
 * - WCAG AAA contrast: body text slate-700 on white (10.9:1), primary button
 *   teal-900 on teal-300-adjacent (high contrast), muted text >= slate-600.
 */

import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, Star } from "lucide-react";

/* ── Score report sample data ──────────────────────────────────────────────── */

const COMMUNICATIVE_SKILLS = [
  { label: "Speaking", score: 75, bar: "bg-sky-500", chipBg: "#EFF8FF" },
  { label: "Writing", score: 72, bar: "bg-violet-500", chipBg: "#F7F2FF" },
  { label: "Reading", score: 76, bar: "bg-emerald-500", chipBg: "#EDFAF3" },
  { label: "Listening", score: 70, bar: "bg-amber-500", chipBg: "#FFF8EC" },
] as const;

const ENABLING_SKILLS = [
  { label: "Grammar", score: 74 },
  { label: "Oral Fluency", score: 71 },
  { label: "Pronunciation", score: 69 },
  { label: "Spelling", score: 80 },
  { label: "Vocabulary", score: 75 },
  { label: "Written Discourse", score: 72 },
] as const;

/** PTE scale is 10–90; map a score to a 0–100 bar width. */
const toBarWidth = (score: number) => ((score - 10) / 80) * 100;

/* ── Primary button with full state coverage ───────────────────────────────── */

type PrimaryCtaProps = {
  href: string;
  children: React.ReactNode;
  external?: boolean;
};

function PrimaryCta({ href, children, external }: PrimaryCtaProps) {
  const [navigating, setNavigating] = useState(false);

  const className = [
    "group relative inline-flex items-center justify-center gap-2",
    "rounded-lg px-8 py-4 text-base font-semibold",
    "bg-teal-700 text-white",
    "shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_8px_16px_-4px_rgba(15,118,110,0.45)]",
    "transition-[transform,background-color,box-shadow] duration-150 ease-out",
    "hover:bg-teal-800 hover:shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_12px_20px_-4px_rgba(15,118,110,0.5)]",
    "active:bg-teal-900 active:translate-y-px active:shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_4px_8px_-4px_rgba(15,118,110,0.5)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900",
    "disabled:opacity-70 disabled:pointer-events-none",
  ].join(" ");

  const handleClick = () => setNavigating(true);

  return (
    <Link href={href}>
      <a
        href={navigating ? undefined : href}
        onClick={handleClick}
        aria-busy={navigating}
        aria-disabled={navigating}
        className={className}
      >
        {navigating ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <>
            {children}
            <ArrowRight
              className="h-5 w-5 transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </>
        )}
      </a>
    </Link>
  );
}

/* ── Browser-chrome frame that grounds the score card ──────────────────────── */

function DashboardFrame() {
  return (
    <div
      aria-hidden={false}
      className="relative"
      role="img"
      aria-label="Preview of a PTEMaster score report showing an overall score of 73 with per-skill breakdowns and AI coaching feedback"
    >
      {/* Layered outline: outer ring + frame, both intentional, no washed-out borders */}
      <div className="absolute -inset-2 rounded-3xl border-2 border-teal-700/15" aria-hidden="true" />
      <div className="absolute -inset-1 rounded-[22px] border border-slate-200" aria-hidden="true" />

      {/* Score card — friendly, not technical: no fake browser chrome, no
          terminal/monospace styling. Just the report, warmly presented. */}
      <figure className="relative m-2 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_32px_64px_-24px_rgba(13,148,136,0.35),0_8px_24px_-8px_rgba(15,23,42,0.12)]">
        {/* Warm gradient header band with the headline score */}
        <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 px-6 pb-16 pt-6 sm:px-8">
          {/* Soft decorative circles, echoing the brand mark */}
          <span
            className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10"
            aria-hidden="true"
          />
          <span
            className="absolute -right-2 top-8 h-24 w-24 rounded-full bg-white/10"
            aria-hidden="true"
          />

          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-50/90">
                Score Report
              </p>
              <p className="mt-0.5 font-display text-lg font-semibold text-white">
                PTE Academic
              </p>
            </div>
            {/* Score chip pops against the teal band */}
            <div className="rounded-2xl bg-white/95 px-4 py-3 text-center shadow-lg">
              <p className="font-display text-4xl font-bold leading-none text-teal-800 tabular-nums">
                73
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                C1 · Advanced
              </p>
            </div>
          </div>
        </div>

        {/* Overlapping card: the skills panel slides up over the teal band,
            giving depth without any technical window dressing */}
        <figcaption className="sr-only">
          Sample PTE Academic score report generated by PTEMaster
        </figcaption>

        <div className="relative -mt-10 rounded-t-3xl bg-white px-6 pb-6 pt-6 sm:px-8">
          {/* Communicative skills: colorful chip-per-skill grid */}
          <div className="grid grid-cols-2 gap-3">
            {COMMUNICATIVE_SKILLS.map((skill) => (
              <div
                key={skill.label}
                className="rounded-2xl border border-slate-100 p-3 transition-colors"
                style={{ backgroundColor: `${skill.chipBg}` }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    {skill.label}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums text-white ${skill.bar}`}
                  >
                    {skill.score}
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-white/70"
                  role="presentation"
                >
                  <div
                    className={`h-full rounded-full ${skill.bar}`}
                    style={{ width: `${toBarWidth(skill.score)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Enabling skills */}
          <div className="mt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Enabling Skills
            </p>
            <ul className="space-y-2.5">
              {ENABLING_SKILLS.map((skill) => (
                <li key={skill.label} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs font-medium text-slate-700">
                    {skill.label}
                  </span>
                  <span
                    className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                    role="presentation"
                  >
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                      style={{ width: `${toBarWidth(skill.score)}%` }}
                    />
                  </span>
                  <span className="w-7 shrink-0 text-right text-xs font-bold tabular-nums text-slate-900">
                    {skill.score}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI feedback strip */}
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-teal-50 p-4">
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 font-display text-xs font-bold text-white"
              aria-hidden="true"
            >
              AI
            </span>
            <p className="text-xs leading-relaxed text-teal-900">
              <span className="font-semibold">Coach note:</span> Pronunciation is
              limiting your overall band. Focus on word stress in academic
              vocabulary with 10 Read Aloud tasks daily.
            </p>
          </div>
        </div>
      </figure>
    </div>
  );
}

/* ── Hero section ──────────────────────────────────────────────────────────── */

export default function HeroSection() {
  const { isAuthenticated } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const primaryHref = isAuthenticated ? "/practice" : getLoginUrl();

  const fadeUp = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-white"
    >
      {/* Quiet, structural background: a soft teal field on the right column only.
          No purple-blue gradients, no blur blobs, no grain. */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-slate-50 lg:block"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-px bg-slate-200 lg:block"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 py-16 lg:grid-cols-2 lg:gap-8 lg:py-24 xl:gap-16">
          {/* ── Copy column: one job — headline, proof, one CTA ── */}
          <div className="max-w-xl">
            <motion.h1
              id="hero-heading"
              className="font-display text-4xl font-bold leading-[1.1] text-slate-900 sm:text-5xl lg:text-[3.5rem]"
              {...fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              Hit the PTE score your visa needs.
            </motion.h1>

            <motion.p
              className="mt-6 text-lg leading-relaxed text-slate-700"
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            >
              Practice every one of the 20 official PTE Academic task types and
              get your responses scored in seconds against the Pearson scoring
              criteria, with a coach that tells you exactly what to fix next.
            </motion.p>

            {/* Proof line — replaces the crowded trust-badge cluster */}
            <motion.dl
              className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4"
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center gap-0.5"
                  role="img"
                  aria-label="Rated 4.9 out of 5"
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-500 text-amber-500"
                      aria-hidden="true"
                    />
                  ))}
                </span>
                <span className="text-sm font-semibold text-slate-900">4.9</span>
              </div>
              <div>
                <dt className="sr-only">Practice questions</dt>
                <dd className="text-sm text-slate-700">
                  <strong className="font-semibold text-slate-900">500+</strong>{" "}
                  exam-style questions
                </dd>
              </div>
              <div>
                <dt className="sr-only">Learners</dt>
                <dd className="text-sm text-slate-700">
                  <strong className="font-semibold text-slate-900">10,000+</strong>{" "}
                  candidates prepared
                </dd>
              </div>
            </motion.dl>

            {/* The one CTA. Target-score selection happens after sign-up,
                inside onboarding where it has context. */}
            <motion.div
              className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            >
              <PrimaryCta href={primaryHref}>
                {isAuthenticated ? "Continue Practicing" : "Start Practicing Free"}
              </PrimaryCta>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                Free plan, no card required
              </p>
            </motion.div>
          </div>

          {/* ── Preview column: grounded dashboard mockup ── */}
          <motion.div
            className="relative lg:pl-8"
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 32 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <DashboardFrame />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
