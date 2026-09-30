"use client";

/**
 * The hero's presentation video (ADR-0023, Phase 2). The static render stays the first image (and
 * the largest paint); the video loads only after the page, when the browser is idle, and fades in
 * over the render once it can play without stalling. On scroll it fades and shrinks a little,
 * revealing the render and the 3D hall underneath (reversible). A button pauses and plays it
 * (WCAG 2.2.2); it pauses by itself off-screen. With reduced motion, Save-Data, a slow connection
 * or a weak phone it does not start on its own: the render stays, with a play button. On phones
 * the 3D hall waits until the video is off-screen (`data-hero-video` on <html>).
 */
import { useEffect, useRef, useState } from "react";
import { currentDevice, motionLevel } from "@/lib/effects";
import type { HeroVideoManifest } from "@/lib/hero-video";
import { afterLoadIdle } from "@/lib/webgl";

type Labels = { play: string; pause: string; illustrative: string };
type State = "idle" | "loading" | "playing" | "paused";

export function HeroVideo({ manifest, labels }: { manifest: HeroVideoManifest; labels: Labels }) {
  const layer = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>("idle");
  const [shown, setShown] = useState(false);
  const [offered, setOffered] = useState(false);
  const userPaused = useRef(false);
  const shownRef = useRef(false);

  const start = () => {
    const el = video.current;
    if (!el) return;
    if (!el.currentSrc) {
      const small = window.matchMedia("(max-width: 720px)").matches;
      const variant = small ? manifest.mobile : manifest.desktop;
      for (const [type, src] of [
        ["video/webm", variant.webm],
        ["video/mp4", variant.mp4],
      ] as const) {
        const source = document.createElement("source");
        source.type = type;
        source.src = src;
        el.append(source);
      }
      el.load();
    }
    setState("loading");
    el.play().catch(() => {
      setState("idle");
      setOffered(true);
    });
  };

  useEffect(() => {
    const el = video.current;
    const hero = layer.current?.closest("section");
    if (!el || !hero) return;
    const root = document.documentElement;
    const onPlaying = () => {
      shownRef.current = true;
      setState("playing");
      setShown(true);
      root.dataset.heroVideo = "playing";
    };
    const onPause = () => {
      setState((s) => (s === "idle" ? s : "paused"));
      delete root.dataset.heroVideo;
      window.dispatchEvent(new Event("hero-video-out"));
    };
    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", onPause);
    const onError = () => setOffered(true);
    el.addEventListener("error", onError);

    // It plays only while the hero is on screen.
    const io = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      if (!entry.isIntersecting && !el.paused) el.pause();
      else if (entry.isIntersecting && el.paused && el.currentSrc && !userPaused.current && shownRef.current) void el.play().catch(() => {});
      if (!entry.isIntersecting) window.dispatchEvent(new Event("hero-video-out"));
    });
    io.observe(hero);

    // The scroll transition: the video fades and shrinks as the hero leaves (reversible).
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const out = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.8)));
        layer.current?.style.setProperty("--hero-video-out", out.toFixed(3));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const auto = motionLevel(currentDevice()) === "on";
    // Not on its own: the render stays, and a play button is offered once the page has loaded.
    const cancel = afterLoadIdle(auto ? start : () => setOffered(true));
    return () => {
      cancel();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("error", onError);
      delete root.dataset.heroVideo;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (state === "playing") {
      userPaused.current = true;
      el.pause();
    } else {
      userPaused.current = false;
      start();
    }
  };

  const showButton = shown || offered;
  return (
    <>
      <div ref={layer} className="hero-video" data-shown={shown ? "true" : undefined} aria-hidden="true">
        <video ref={video} muted loop playsInline preload="none" disablePictureInPicture />
      </div>
      {/* Q44: a video of renders or generated images says so, like the render. */}
      {manifest.illustrative && shown && <p className="hero-video__note">{labels.illustrative}</p>}
      {showButton && (
        <button type="button" className="hero-video__toggle" onClick={toggle} aria-label={state === "playing" ? labels.pause : labels.play}>
          <span aria-hidden="true" className={state === "playing" ? "hero-video__icon is-pause" : "hero-video__icon is-play"} />
        </button>
      )}
    </>
  );
}
