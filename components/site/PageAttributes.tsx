"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Keeps <html data-page> in sync on client-side navigation. The server sets the first value,
 * so the header never jumps on load; the home page then drives data-tone scene by scene.
 */
export function PageAttributes() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const isHome = pathname === "/";
    root.dataset.page = isHome ? "home" : "inner";
    if (!isHome) root.dataset.tone = "dark";
  }, [pathname]);
  return null;
}
