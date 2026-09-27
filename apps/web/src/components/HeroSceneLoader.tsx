"use client";

import dynamic from "next/dynamic";

// The 3D scene is client-only and loaded lazily, after the text is on screen (LCP first).
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

export default function HeroSceneLoader() {
  return <HeroScene />;
}
