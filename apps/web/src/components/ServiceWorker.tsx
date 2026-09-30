"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (public/sw.js, the installable site, §9.4) once the page has loaded
 * and the browser is idle, so it never competes with the first paint. Production builds only.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    const idle = () => {
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(register);
      else setTimeout(register, 1);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
    return () => window.removeEventListener("load", idle);
  }, []);
  return null;
}
