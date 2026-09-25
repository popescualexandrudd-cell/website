"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll effects for the public site:
 *  - categories (sections) and the items inside them fade in from above as they come into
 *    view, one after another from top to bottom;
 *  - titles light up word by word while they travel up the screen;
 *  - the opening video draws back into a frame as the page scrolls (--hero-p), the header takes
 *    its colour once the page has moved, lines fill (--line-p) and figures count up.
 * Only elements still below the fold are prepared, so nothing already on screen blinks. Nothing
 * happens without JavaScript or with "reduce motion": the page is then fully visible at once.
 */
const SECTIONS = [
  ".home > section:not(:first-child)",
  "main .page-section",
  ".program-hero",
  ".site-footer .grid-page > *",
].join(",");

const ITEMS = [
  ".story-step",
  ".pillar-card",
  ".step-card",
  ".amenity-card",
  ".tournament-card",
  ".tournament-row",
  ".court-card",
  ".social-card",
  ".pathway-step",
  ".stage",
  ".coach-card",
  ".mosaic-item",
  ".figure",
  ".group-card",
  ".result-row",
  ".method-step",
  ".program-card",
  ".ed-row",
  ".faq-item",
  ".fact-list > div",
  ".focus-list > li",
  ".gallery-item",
  ".venue-court",
  ".venue-amenities > li",
  ".coach-credentials li",
  ".testimonial",
].join(",");

const STAGGER_MS = 90;
const MAX_STAGGER = 6;

/** Counts a figure up from zero to its value (the final text is already in the page). */
function countUp(el: HTMLElement) {
  const target = Number(el.dataset.countup);
  if (!Number.isFinite(target) || target <= 0) return;
  const suffix = (el.textContent ?? "").replace(/^\d+/, "");
  const start = performance.now();
  const duration = Math.min(1600, 500 + target * 60);
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = `${Math.round(target * eased)}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function ScrollEffects() {
  const pathname = usePathname();

  // The header over the opening video takes its colour once the page has moved (any motion
  // setting: this is not an animation).
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    if (!header) return;
    const root = document.documentElement;
    const update = () => {
      header.dataset.scrolled = String(window.scrollY > 24);
      // How far down the page the visitor is, for the thin progress bar at the top.
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty("--scroll-p", max > 0 ? (window.scrollY / max).toFixed(4) : "0");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches || !("IntersectionObserver" in window)) {
      root.classList.remove("fx");
      return;
    }
    root.classList.add("fx");
    const fold = window.innerHeight;
    const below = (el: Element) => el.getBoundingClientRect().top > fold * 0.92;

    // ── Fade in from above, top to bottom ──
    const targets = [
      ...document.querySelectorAll<HTMLElement>(SECTIONS),
      ...document.querySelectorAll<HTMLElement>(ITEMS),
    ].filter((el) => el.dataset.fx !== "in" && below(el));
    for (const el of targets) el.dataset.fx = "wait";

    const reveal = new IntersectionObserver(
      (entries) => {
        // Items that arrive together are staggered in their order on the page.
        const arriving = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target as HTMLElement)
          .sort(
            (a, b) =>
              a.getBoundingClientRect().top - b.getBoundingClientRect().top ||
              a.getBoundingClientRect().left - b.getBoundingClientRect().left,
          );
        arriving.forEach((el, i) => {
          el.style.setProperty("--fx-delay", `${Math.min(i, MAX_STAGGER) * STAGGER_MS}ms`);
          el.dataset.fx = "in";
          reveal.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    targets.forEach((el) => reveal.observe(el));

    // ── Figures count up the first time they come into view ──
    const counters = [...document.querySelectorAll<HTMLElement>("[data-countup]")].filter(below);
    const counting = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          countUp(e.target as HTMLElement);
          counting.unobserve(e.target);
        }
      },
      { threshold: 0.4 },
    );
    counters.forEach((el) => counting.observe(el));

    // ── The opening and the lines that fill with the scroll ──
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    const lines = [...document.querySelectorAll<HTMLElement>("[data-progress-line]")];

    // ── Titles, word by word, following the scroll ──
    const titles = [...document.querySelectorAll<HTMLElement>(".fx-words")];
    const visible = new Set<HTMLElement>();
    const watch = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target as HTMLElement);
          else visible.delete(e.target as HTMLElement);
        }
        schedule();
      },
      { rootMargin: "10% 0px 10% 0px" },
    );
    let frame = 0;
    const update = () => {
      frame = 0;
      const h = window.innerHeight;
      if (hero) {
        const travel = Math.max(1, hero.offsetHeight - h);
        const p = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / travel));
        hero.style.setProperty("--hero-p", p.toFixed(4));
      }
      for (const el of lines) {
        const rect = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (h * 0.9 - rect.top) / (h * 0.55)));
        el.style.setProperty("--line-p", p.toFixed(3));
      }
      for (const el of visible) {
        const top = el.getBoundingClientRect().top;
        // 0 when the title enters at the bottom, 1 once it reaches the upper half of the screen.
        const progress = Math.min(1, Math.max(0, (h * 0.95 - top) / (h * 0.5)));
        el.style.setProperty("--fx-p", progress.toFixed(3));
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    for (const el of titles) {
      // A title already on screen when the page opens, or already read above it, stays lit.
      if (!below(el)) {
        el.style.setProperty("--fx-p", "1");
        continue;
      }
      watch.observe(el);
    }
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();

    const stop = () => {
      // Whatever has not been revealed yet goes back to plain (a new run may prepare it again).
      for (const el of targets) if (el.dataset.fx === "wait") delete el.dataset.fx;
      reveal.disconnect();
      watch.disconnect();
      counting.disconnect();
      hero?.style.removeProperty("--hero-p");
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
    // Someone turning on "reduce motion" midway gets the whole page at once.
    const onReduce = () => {
      if (!reduce.matches) return;
      stop();
      root.classList.remove("fx");
    };
    reduce.addEventListener("change", onReduce);
    return () => {
      stop();
      reduce.removeEventListener("change", onReduce);
    };
  }, [pathname]);

  return null;
}
