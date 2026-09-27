"use client";

import dynamic from "next/dynamic";

// The live scene is client-only and loaded after the page (the static render is the LCP image).
const ArenaScene = dynamic(() => import("./ArenaScene"), { ssr: false });

/** Static render first (with alt text), the real-time 3D scene fades in over it on capable devices. */
export function HeroVisual({ alt }: { alt: string }) {
  return (
    <div className="hero-visual">
      <picture>
        <source media="(max-width: 720px)" srcSet="/renders/arena-tall.webp" width={900} height={1960} />
        <img src="/renders/arena-wide.webp" alt={alt} width={1920} height={980} decoding="async" />
      </picture>
      <ArenaScene />
    </div>
  );
}
