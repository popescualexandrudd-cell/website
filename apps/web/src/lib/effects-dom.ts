/**
 * The site's effects that need a few lines of script (ADR-0023), used by `EffectsRuntime` and only
 * at the full motion level: numbers that count up to their value, cards that tilt after the cursor,
 * the header's progress bar and the menu's current section. None of them changes content: a number
 * always ends on the text the server rendered.
 */

/** "2 × 2", "18 + 10" stay as they are; the first number of a text counts from 0 to itself. */
export function countingFrames(text: string, frames: number): string[] {
  const match = text.match(/\d+(?:[.,]\d+)?/);
  if (!match || frames < 2) return [text];
  const raw = match[0];
  const separator = raw.includes(",") ? "," : ".";
  const target = Number(raw.replace(",", "."));
  const decimals = (raw.split(/[.,]/)[1] ?? "").length;
  const out: string[] = [];
  for (let i = 1; i <= frames; i += 1) {
    const eased = 1 - (1 - i / frames) ** 3;
    const value = i === frames ? raw : (target * eased).toFixed(decimals).replace(".", separator);
    out.push(text.replace(raw, value));
  }
  return out;
}

/** Counts the element's number up when it appears (about 0.9 s), then leaves its own text. */
export function countUp(el: HTMLElement): void {
  const text = el.textContent ?? "";
  const frames = countingFrames(text, 54);
  if (frames.length < 2) return;
  el.setAttribute("aria-label", text); // assistive technology reads the value, not the counting
  let i = 0;
  const step = () => {
    el.textContent = frames[i] ?? text;
    i += 1;
    if (i < frames.length) requestAnimationFrame(step);
    else {
      el.textContent = text;
      el.removeAttribute("aria-label");
    }
  };
  requestAnimationFrame(step);
}

/** The tilt of a card for a pointer at (x, y) inside a box, within ±max degrees. */
export function tiltFor(box: { left: number; top: number; width: number; height: number }, x: number, y: number, max: number) {
  const px = Math.min(1, Math.max(0, (x - box.left) / box.width));
  const py = Math.min(1, Math.max(0, (y - box.top) / box.height));
  return {
    rotateY: (px - 0.5) * 2 * max,
    rotateX: (0.5 - py) * 2 * max,
    glowX: px * 100,
    glowY: py * 100,
  };
}

/** Cards with `data-tilt` follow a fine pointer (desktop only). Returns a cleanup. */
export function bindTilt(root: Document, max: number): () => void {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  const move = (event: PointerEvent) => {
    const card = event.target instanceof Element ? (event.target.closest("[data-tilt]") as HTMLElement | null) : null;
    if (!card) return;
    const t = tiltFor(card.getBoundingClientRect(), event.clientX, event.clientY, max);
    card.style.setProperty("--tilt-x", `${t.rotateY.toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${t.rotateX.toFixed(2)}deg`);
    card.style.setProperty("--glow-x", `${t.glowX.toFixed(1)}%`);
    card.style.setProperty("--glow-y", `${t.glowY.toFixed(1)}%`);
  };
  const leave = (event: PointerEvent) => {
    const card = event.target instanceof Element ? (event.target.closest("[data-tilt]") as HTMLElement | null) : null;
    if (card && !card.contains(event.relatedTarget as Node | null)) {
      for (const name of ["--tilt-x", "--tilt-y", "--glow-x", "--glow-y"]) card.style.removeProperty(name);
    }
  };
  root.addEventListener("pointermove", move, { passive: true });
  root.addEventListener("pointerout", leave, { passive: true });
  return () => {
    root.removeEventListener("pointermove", move);
    root.removeEventListener("pointerout", leave);
  };
}

/** How far down the page is read, 0 to 1. */
export function scrollProgress(scrollY: number, pageHeight: number, viewport: number): number {
  const range = pageHeight - viewport;
  return range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0;
}

/** The home page section a menu link belongs to ("/ro/liga" → "liga"). */
export const SECTION_OF: Record<string, string> = {
  padel: "padel",
  liga: "liga",
  league: "liga",
  tenis: "tenis",
  tennis: "tenis",
  pilates: "pilates",
  pachete: "pachete",
  packages: "pachete",
  evenimente: "evenimente",
  events: "evenimente",
  cafenea: "cafenea",
  cafe: "cafenea",
  contact: "locatie",
};

/**
 * The header: a brass progress bar (a decorative element it adds itself) and, on the home page, the
 * menu link of the section in view marked `data-active`. Returns a cleanup.
 */
export function bindHeader(doc: Document): () => void {
  const header = doc.querySelector<HTMLElement>(".site-header--full");
  if (!header) return () => {};
  const bar = doc.createElement("span");
  bar.className = "site-header__progress";
  bar.setAttribute("aria-hidden", "true");
  header.append(bar);
  let frame = 0;
  const onScroll = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const p = scrollProgress(window.scrollY, doc.documentElement.scrollHeight, window.innerHeight);
      bar.style.setProperty("--progress", p.toFixed(4));
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const links = new Map<string, HTMLAnchorElement[]>();
  header.querySelectorAll<HTMLAnchorElement>(".full-nav a[href]").forEach((a) => {
    const id = SECTION_OF[a.pathname.split("/").filter(Boolean).at(-1) ?? ""];
    if (id && doc.getElementById(id)) links.set(id, [...(links.get(id) ?? []), a]);
  });
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        for (const a of links.get(entry.target.id) ?? []) {
          if (entry.isIntersecting) a.dataset.active = "true";
          else delete a.dataset.active;
        }
      }
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  for (const id of links.keys()) io.observe(doc.getElementById(id) as HTMLElement);
  return () => {
    window.removeEventListener("scroll", onScroll);
    cancelAnimationFrame(frame);
    io.disconnect();
    bar.remove();
    links.forEach((list) => list.forEach((a) => delete a.dataset.active));
  };
}
