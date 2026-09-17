/**
 * Walkthrough Tour
 *
 * A context-aware, step-by-step guided tour. Each step targets a DOM element
 * via `[data-tour="..."]`, scrolls it into view, renders a spotlight cutout in
 * the backdrop, and positions an accessible popover near the target with
 * auto-placement fallbacks (prefers the requested side, flips when it would
 * overflow the viewport, and falls back to a centered card when the target is
 * not mounted, e.g. behind a conditional render).
 *
 * Accessibility:
 *  - role="dialog" with aria-labelledby / aria-describedby
 *  - Escape dismisses; ArrowRight/ArrowLeft navigate; Tab is trapped inside
 *    the popover
 *  - "Skip tour" is always available; clicking the dimmed backdrop exits
 *
 * Persistence: completion is stored in localStorage
 * (`pte.tour.<tourId>.completed`), so the tour auto-starts only once per user
 * unless `resetTour()` is called or localStorage is cleared.
 */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────────── */

export type TourSide = "top" | "bottom" | "left" | "right";

export interface TourStep {
  /** Value of `data-tour` on the element to highlight */
  target: string;
  /** Short title shown in the popover header */
  title: string;
  /** Body copy describing the feature */
  content: string;
  /** Preferred side of the target (flips automatically on overflow) */
  side?: TourSide;
  /**
   * Optional CSS selector that advances the tour when clicked, letting the
   * user perform the action instead of just reading about it.
   */
  advanceOn?: string;
}

interface WalkthroughTourProps {
  /** Stable id, used for the localStorage key */
  tourId: string;
  steps: TourStep[];
  /** Label for the primary button on the final step */
  finishLabel?: string;
  /** Called after the tour ends by any means */
  onComplete?: () => void;
  /** Force the tour open regardless of stored state */
  forceOpen?: boolean;
}

/* ── Persistence helpers ───────────────────────────────────────────────────── */

const storageKey = (tourId: string) => `pte.tour.${tourId}.completed`;

export function isTourCompleted(tourId: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(tourId)) === "true";
  } catch {
    return false;
  }
}

export function completeTour(tourId: string): void {
  try {
    window.localStorage.setItem(storageKey(tourId), "true");
  } catch {
    /* storage unavailable (private mode); tour just restarts next visit */
  }
}

export function resetTour(tourId: string): void {
  try {
    window.localStorage.removeItem(storageKey(tourId));
  } catch {
    /* ignore */
  }
}

/* ── Positioning ───────────────────────────────────────────────────────────── */

const POPOVER_GAP = 12;
const VIEWPORT_MARGIN = 16;
const POPOVER_WIDTH = 320;
const POPOVER_EST_HEIGHT = 230;

type Rect = { top: number; left: number; width: number; height: number };

type Placement = {
  popover: { top: number; left: number };
  arrow: { top: number; left: number };
  side: TourSide;
};

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function measureTarget(step: TourStep): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
  if (!el) return null;

  // Bring the target into view before measuring so the spotlight matches what
  // the user actually sees.
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? "instant" : "smooth",
    block: "center",
  });

  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function computePlacement(rect: Rect, preferred: TourSide): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spaceTop = rect.top - POPOVER_GAP;
  const spaceBottom = vh - (rect.top + rect.height) - POPOVER_GAP;
  const spaceLeft = rect.left - POPOVER_GAP;
  const spaceRight = vw - (rect.left + rect.width) - POPOVER_GAP;

  const fits = (side: TourSide) =>
    side === "top"
      ? spaceTop >= POPOVER_EST_HEIGHT
      : side === "bottom"
        ? spaceBottom >= POPOVER_EST_HEIGHT
        : side === "left"
          ? spaceLeft >= POPOVER_WIDTH
          : spaceRight >= POPOVER_WIDTH;

  const order: TourSide[] = [
    preferred,
    ...(["top", "bottom", "right", "left"] as TourSide[]).filter((s) => s !== preferred),
  ];
  const side = order.find(fits) ?? preferred;

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const popover = { top: 0, left: 0 };
  const arrow = { top: 0, left: 0 };

  switch (side) {
    case "top":
      popover.top = rect.top - POPOVER_GAP - POPOVER_EST_HEIGHT;
      popover.left = clamp(centerX - POPOVER_WIDTH / 2, VIEWPORT_MARGIN, vw - POPOVER_WIDTH - VIEWPORT_MARGIN);
      arrow.top = POPOVER_EST_HEIGHT - 8;
      arrow.left = clamp(centerX - popover.left, 24, POPOVER_WIDTH - 24);
      break;
    case "bottom":
      popover.top = rect.top + rect.height + POPOVER_GAP;
      popover.left = clamp(centerX - POPOVER_WIDTH / 2, VIEWPORT_MARGIN, vw - POPOVER_WIDTH - VIEWPORT_MARGIN);
      arrow.top = -8;
      arrow.left = clamp(centerX - popover.left, 24, POPOVER_WIDTH - 24);
      break;
    case "left":
      popover.left = rect.left - POPOVER_GAP - POPOVER_WIDTH;
      popover.top = clamp(centerY - POPOVER_EST_HEIGHT / 2, VIEWPORT_MARGIN, vh - POPOVER_EST_HEIGHT - VIEWPORT_MARGIN);
      arrow.left = POPOVER_WIDTH - 8;
      arrow.top = clamp(centerY - popover.top, 24, POPOVER_EST_HEIGHT - 24);
      break;
    case "right":
      popover.left = rect.left + rect.width + POPOVER_GAP;
      popover.top = clamp(centerY - POPOVER_EST_HEIGHT / 2, VIEWPORT_MARGIN, vh - POPOVER_EST_HEIGHT - VIEWPORT_MARGIN);
      arrow.left = -8;
      arrow.top = clamp(centerY - popover.top, 24, POPOVER_EST_HEIGHT - 24);
      break;
  }

  return { popover, arrow, side };
}

/** Spotlight cutout as a clip-path polygon (an even-odd hole around the target). */
function spotPolygon(rect: Rect, pad = 8): string {
  const x1 = Math.max(0, rect.left - pad);
  const y1 = Math.max(0, rect.top - pad);
  const x2 = Math.min(window.innerWidth, rect.left + rect.width + pad);
  const y2 = Math.min(window.innerHeight, rect.top + rect.height + pad);
  return `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    ${x1}px ${y1}px, ${x1}px ${y2}px, ${x2}px ${y2}px, ${x2}px ${y1}px, ${x1}px ${y1}px
  )`;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function WalkthroughTour({
  tourId,
  steps,
  finishLabel = "Get Started",
  onComplete,
  forceOpen = false,
}: WalkthroughTourProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const bodyId = useId();

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const start = useCallback(() => {
    setIndex(0);
    setOpen(true);
  }, []);

  // Auto-start once per user unless forced or already completed
  useEffect(() => {
    if (forceOpen || !isTourCompleted(tourId)) {
      const timer = window.setTimeout(start, 400); // let the page settle
      return () => window.clearTimeout(timer);
    }
  }, [forceOpen, tourId, start]);

  const finish = useCallback(() => {
    completeTour(tourId);
    setOpen(false);
    onComplete?.();
  }, [tourId, onComplete]);

  const goTo = useCallback(
    (next: number) => {
      if (next >= steps.length) {
        finish();
      } else if (next >= 0) {
        setIndex(next);
      }
    },
    [steps.length, finish]
  );

  // Measure the target whenever the step changes, the window resizes, or the
  // user scrolls inside any scrollable container.
  useLayoutEffect(() => {
    if (!open || !step) return;

    const update = () => {
      const nextRect = measureTarget(step);
      setRect(nextRect);
      setPlacement(nextRect ? computePlacement(nextRect, step.side ?? "bottom") : null);
    };

    update();

    const reposition = () => {
      const nextRect = measureTarget(step);
      setRect(nextRect);
      setPlacement(nextRect ? computePlacement(nextRect, step.side ?? "bottom") : null);
    };

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, index, step]);

  // Interactive step: clicking the advanceOn selector advances the tour while
  // letting the click perform its real action.
  useEffect(() => {
    if (!open || !step?.advanceOn) return;

    const handler = (event: MouseEvent) => {
      const clicked = (event.target as HTMLElement)?.closest(step.advanceOn!);
      if (clicked) {
        window.setTimeout(() => goTo(index + 1), 250);
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [open, step, index, goTo]);

  // Keyboard: Escape dismisses, arrows navigate, Tab traps inside the popover.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index + 1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index - 1);
        return;
      }
      if (event.key === "Tab" && popoverRef.current) {
        const focusables = popoverRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        const inside = popoverRef.current.contains(active);

        if (event.shiftKey && (active === first || !inside)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !inside)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, index, goTo, finish]);

  // Move focus into the popover whenever it opens or the step changes
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      popoverRef.current?.querySelector<HTMLElement>("[data-tour-primary]")?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open, index]);

  // Lock body scroll while the tour is open
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !step || typeof document === "undefined") return null;

  const centered = rect === null;
  const primaryLabel = isLast ? finishLabel : "Next";

  return createPortal(
    <>
      {/* Spotlight backdrop: dims everything except a cutout around the target */}
      <motion.div
        className="fixed inset-0 z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          background: "rgba(15, 23, 42, 0.55)",
          ...(centered ? {} : { clipPath: spotPolygon(rect!), transition: "clip-path 0.3s ease" }),
        }}
        onClick={finish}
        aria-hidden="true"
      />

      {/* Highlight ring around the target (pointer-events pass through so the
          user can still interact with the highlighted element) */}
      {!centered && (
        <motion.div
          className="pointer-events-none fixed z-[101] rounded-lg border-2 border-white shadow-[0_0_0_4px_rgba(38,198,218,0.35)]"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            top: rect!.top - 6,
            left: rect!.left - 6,
            width: rect!.width + 12,
            height: rect!.height + 12,
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          aria-hidden="true"
        />
      )}

      {/* Step popover */}
      <motion.div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={bodyId}
        className="fixed z-[102] w-80 rounded-xl bg-white shadow-[0_20px_40px_-12px_rgba(15,23,42,0.4)] border border-slate-200"
        style={
          centered
            ? {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
              }
            : {
                top: placement!.popover.top,
                left: placement!.popover.left,
                width: POPOVER_WIDTH,
              }
        }
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          ...(centered ? {} : { top: placement!.popover.top, left: placement!.popover.left }),
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Arrow pointing at the target */}
        {!centered && (
          <span
            aria-hidden="true"
            className="absolute h-4 w-4 rotate-45 border border-slate-200 bg-white"
            style={{
              top: placement!.arrow.top,
              left: placement!.arrow.left,
              borderTopWidth: placement!.side === "top" ? 0 : undefined,
              borderLeftWidth: placement!.side === "left" ? 0 : undefined,
              borderBottomWidth: placement!.side === "bottom" ? 0 : undefined,
              borderRightWidth: placement!.side === "right" ? 0 : undefined,
              ...(placement!.side === "top" && { borderBottom: "none", borderRight: "none", top: "calc(100% - 8px)" }),
              ...(placement!.side === "bottom" && { borderTop: "none", borderLeft: "none" }),
              ...(placement!.side === "left" && { borderTop: "none", borderLeft: "none", left: "calc(100% - 8px)" }),
              ...(placement!.side === "right" && { borderBottom: "none", borderRight: "none" }),
            }}
          />
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider text-teal-700"
            >
              Step {index + 1} of {steps.length}
            </p>
            <button
              type="button"
              onClick={finish}
              className="-m-1 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <h2 id={headingId} className="mt-1 font-display text-base font-semibold text-slate-900">
            {step.title}
          </h2>
          <p id={bodyId} className="mt-2 text-sm leading-relaxed text-slate-700">
            {step.content}
          </p>

          {/* Progress dots */}
          <div className="mt-4 flex items-center gap-1.5" role="presentation">
            {steps.map((s, i) => (
              <span
                key={s.target + i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === index ? "w-5 bg-teal-700" : i < index ? "w-1.5 bg-teal-700/40" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => (index === 0 ? finish() : goTo(index - 1))}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              {index === 0 ? "Skip tour" : "Back"}
            </button>

            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                  aria-label="Previous step"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                data-tour-primary
                onClick={() => goTo(index + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-teal-800 active:translate-y-px active:bg-teal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
              >
                {primaryLabel}
                {!isLast && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  );
}
