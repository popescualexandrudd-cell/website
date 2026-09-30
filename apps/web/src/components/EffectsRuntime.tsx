"use client";

/**
 * The one script of the site's effects (ADR-0023). It sets the motion level on <html> and marks
 * each `[data-reveal]` element `data-shown` once it comes into view (also elements added later,
 * such as live data); the effects themselves are CSS. A focused element, and the elements around
 * it, show at once (keyboard users never land on something invisible). Rendered only when the
 * `web_effects` switch is on; no texts, no data.
 */
import { useEffect } from "react";
import { currentDevice, motionLevel } from "@/lib/effects";

const SELECTOR = "[data-reveal]:not([data-shown])";

export function EffectsRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = motionLevel(currentDevice());
    const show = (el: Element) => {
      (el as HTMLElement).dataset.shown = "true";
      io.unobserve(el);
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
    return () => {
      io.disconnect();
      added.disconnect();
      document.removeEventListener("focusin", focused);
      delete root.dataset.motion;
    };
  }, []);
  return null;
}
