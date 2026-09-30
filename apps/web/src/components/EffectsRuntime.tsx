"use client";

/**
 * The one script of the site's effects (ADR-0023). It sets the motion level on <html> and marks
 * each `[data-reveal]` element `data-shown` once it comes into view (also elements added later,
 * such as live data); the effects themselves are CSS. At full motion it also counts numbers up
 * (`data-count`), tilts cards after the cursor (`data-tilt`) and runs the header's progress bar and
 * current section (src/lib/effects-dom.ts). A focused element, and the elements around
 * it, show at once (keyboard users never land on something invisible). Rendered only when the
 * `web_effects` switch is on; no texts, no data.
 */
import { useEffect } from "react";
import { currentDevice, motionLevel } from "@/lib/effects";
import { bindHeader, bindTilt, countUp } from "@/lib/effects-dom";

const SELECTOR = "[data-reveal]:not([data-shown])";

export function EffectsRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    const level = motionLevel(currentDevice());
    root.dataset.motion = level;
    const full = level === "on";
    const show = (el: Element) => {
      const element = el as HTMLElement;
      if (element.dataset.shown) return;
      element.dataset.shown = "true";
      io.unobserve(el);
      // Numbers count up to their own value, once (full motion only).
      if (full) {
        if (element.matches("[data-count]")) countUp(element);
        element.querySelectorAll<HTMLElement>("[data-count]").forEach(countUp);
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) show(entry.target);
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const watch = (scope: ParentNode) => scope.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    watch(document);
    const added = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(SELECTOR)) io.observe(node);
          watch(node);
        });
      }
    });
    added.observe(document.body, { childList: true, subtree: true });
    const focused = (event: FocusEvent) => {
      let el = event.target instanceof Element ? event.target.closest("[data-reveal]") : null;
      while (el) {
        show(el);
        el = el.parentElement?.closest("[data-reveal]") ?? null;
      }
    };
    document.addEventListener("focusin", focused);
    const unbind = full
      ? [bindTilt(document, Number(getComputedStyle(root).getPropertyValue("--motion-tilt-max")) || 8), bindHeader(document)]
      : [];
    return () => {
      unbind.forEach((off) => off());
      io.disconnect();
      added.disconnect();
      document.removeEventListener("focusin", focused);
      delete root.dataset.motion;
    };
  }, []);
  return null;
}
