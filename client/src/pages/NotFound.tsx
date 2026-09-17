/**
 * 404 page — matches the public marketing design system (Sora display type,
 * teal brand accents, DESIGN_CARD containers, 8px spacing rhythm).
 *
 * - Displays the attempted path so users can spot typos.
 * - Offers contextual exits: the pages that most likely hold what the user
 *   wanted (features, exam structure, pricing) plus Home.
 * - Reports a real 404 to crawlers via `robots` meta.
 */

import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  ArrowRight, BookOpen, Compass, FileQuestion, GraduationCap, Home, LayoutList, Tag,
} from "lucide-react";

const DESIGN_CARD =
  "rounded-2xl border border-gray-200 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)]";

const SUGGESTED_LINKS = [
  { href: "/features", icon: Compass, title: "Features", desc: "What the platform does and how it scores" },
  { href: "/exam-structure", icon: LayoutList, title: "Exam Structure", desc: "All 20 PTE Academic task types" },
  { href: "/score-guide", icon: GraduationCap, title: "Score Guide", desc: "The 10-90 scale and CEFR bands" },
  { href: "/pricing", icon: Tag, title: "Pricing", desc: "Free, Pro, and Premium plans" },
];

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const attemptedPath = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div className="min-h-screen bg-white" role="main">
      {/* robots meta lives in index.html; this visible marker + status text
          helps crawlers treat the page as non-canonical */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center" aria-hidden="true">
              <span className="text-white font-bold text-sm">P</span>
            </span>
            <span className="text-xl font-bold text-gray-900">
              PTE<span className="text-teal-600">Master</span>
            </span>
          </Link>
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
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Big ghost 404 */}
        <p
          aria-hidden="true"
          className="font-display text-[7rem] leading-none font-extrabold tracking-tight text-transparent select-none sm:text-[9rem]"
          style={{ WebkitTextStroke: "2px #99F6E4" }}
        >
          404
        </p>

        <div className={`-mt-6 sm:-mt-10 p-6 sm:p-8 ${DESIGN_CARD} relative`}>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50" aria-hidden="true">
              <FileQuestion className="h-6 w-6 text-teal-700" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900">
                This page doesn't exist
              </h1>
              <p className="text-sm text-muted-foreground">
                Error 404 · Not Found
              </p>
            </div>
          </div>

          <p className="mt-5 leading-relaxed text-gray-700">
            The page you tried to reach isn't here. It may have been moved,
            renamed, or the address may have a typo.
          </p>

          {attemptedPath && attemptedPath !== "/" && (
            <p className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <BookOpen className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              Requested address:{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs break-all text-gray-800">
                {attemptedPath}
              </code>
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setLocation("/")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_16px_-4px_rgba(15,118,110,0.45)] transition-all duration-150 hover:bg-teal-800 hover:shadow-[0_12px_20px_-4px_rgba(15,118,110,0.5)] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </button>
            {isAuthenticated ? (
              <Link
                href="/practice"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 transition-colors hover:border-teal-300 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                Go to Practice
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <a
                href={getLoginUrl()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 transition-colors hover:border-teal-300 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                Start Practicing Free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        {/* Suggested destinations */}
        <nav aria-label="Suggested pages" className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
            You might be looking for
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {SUGGESTED_LINKS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className={`group flex items-start gap-3 p-4 transition-all duration-200 hover:border-teal-300 hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.15)] ${DESIGN_CARD}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50" aria-hidden="true">
                    <s.icon className="h-5 w-5 text-teal-700" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                      {s.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {s.desc}
                    </span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-teal-700" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>© 2025 PTEMaster. Not affiliated with Pearson Education Ltd. PTE Academic™ is a trademark of Pearson Education Ltd.</p>
        </div>
      </footer>
    </div>
  );
}
