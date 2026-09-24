"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Court3D } from "./Court3D";
import { CourtPoster } from "./CourtPoster";
import type { CourtEngine, LabSnapshot, LabView } from "./engine";
import type { StrokeName } from "./engine/strokes";
import { PHASES } from "./engine/phases";

type Phase = { title: string; text: string };
export type LabStroke = { key: StrokeName; name: string; full: string; phases: Phase[] };

type Labels = {
  strokeLabel: string;
  play: string;
  pause: string;
  scrub: string;
  viewLabel: string;
  views: Record<LabView, string>;
  phaseCount: string;
  phasesLabel: string;
  loading: string;
  fallback: string;
  drag: string;
  modelNote: string;
  sceneLabel: string;
};

const VIEWS: LabView[] = ["lateral", "frontal", "spate", "sus"];

/**
 * The technique lab: the 3D biomechanical model plus its controls. Every control is a real
 * button or slider, so the lab works with the keyboard; the phase list and texts are plain
 * content that stays useful even when the 3D scene cannot load.
 */
export function TechniqueLab({ strokes, labels }: { strokes: LabStroke[]; labels: Labels }) {
  const [stroke, setStroke] = useState<StrokeName>(strokes[0]?.key ?? "forehand");
  const [snapshot, setSnapshot] = useState<LabSnapshot | null>(null);
  const [view, setView] = useState<LabView>("lateral");
  const [selectedPhase, setSelectedPhase] = useState(0);
  const [status, setStatus] = useState<string>("poster");
  const engineRef = useRef<CourtEngine | null>(null);
  const id = useId();

  const current = strokes.find((s) => s.key === stroke) ?? strokes[0];
  const live = status === "live";
  const phase = live && snapshot?.stroke === stroke ? snapshot.phase : selectedPhase;
  const phases = current?.phases ?? [];
  const active = phases[phase] ?? phases[0];

  const onEngine = useCallback((engine: CourtEngine | null) => {
    engineRef.current = engine;
    if (engine) setSnapshot(engine.labSnapshot());
  }, []);

  const chooseStroke = (key: StrokeName) => {
    setStroke(key);
    setSelectedPhase(0);
    engineRef.current?.setStroke(key);
  };

  const choosePhase = (index: number) => {
    setSelectedPhase(index);
    const bounds = PHASES[stroke];
    const start = bounds[index] ?? 0;
    const end = bounds[index + 1] ?? start;
    // The most telling moment of a phase is just past its middle.
    engineRef.current?.setTime(start + (end - start) * 0.6);
  };

  const chooseView = (next: LabView) => {
    setView(next);
    engineRef.current?.setView(next);
  };

  const playing = snapshot?.playing ?? false;
  const duration = snapshot?.duration ?? 1;
  const time = snapshot?.time ?? 0;

  return (
    <div className="lab">
      <div className="lab-stage">
        <Court3D
          mode="lab"
          className="lab-viewport"
          label={labels.sceneLabel}
          poster={<CourtPoster variant="lab" />}
          onEngine={onEngine}
          onLab={setSnapshot}
          onStatus={setStatus}
        />
        {status === "loading" ? <p className="lab-status">{labels.loading}</p> : null}
        {status === "unavailable" ? <p className="lab-status">{labels.fallback}</p> : null}
        {live ? (
          <p className="lab-hint" aria-hidden="true">
            {labels.drag}
          </p>
        ) : null}
      </div>

      <div className="lab-panel">
        <div className="lab-group" role="group" aria-label={labels.strokeLabel}>
          {strokes.map((s) => (
            <button
              key={s.key}
              type="button"
              className="lab-toggle"
              aria-pressed={s.key === stroke}
              onClick={() => chooseStroke(s.key)}
            >
              {s.name}
            </button>
          ))}
        </div>

        {live ? (
          <div className="lab-transport">
            <button
              type="button"
              className="lab-play"
              aria-label={playing ? labels.pause : labels.play}
              onClick={() => engineRef.current?.setPlaying(!playing)}
            >
              <span className={playing ? "lab-icon-pause" : "lab-icon-play"} aria-hidden="true" />
            </button>
            <label className="sr-only" htmlFor={`${id}-scrub`}>
              {labels.scrub}
            </label>
            <input
              id={`${id}-scrub`}
              type="range"
              className="lab-scrub"
              min={0}
              max={duration}
              step={0.01}
              value={time}
              onChange={(e) => engineRef.current?.setTime(Number(e.target.value))}
              aria-valuetext={active ? `${active.title}` : undefined}
            />
          </div>
        ) : null}

        <div>
          <p className="lab-phase-count" aria-live="polite">
            {current?.full} ·{" "}
            {labels.phaseCount
              .replace("{n}", String(phase + 1))
              .replace("{total}", String(phases.length))}
          </p>
          <h3 className="lab-phase-title">{active?.title}</h3>
          <p className="lab-phase-text">{active?.text}</p>
        </div>

        <ol className="lab-phases" aria-label={labels.phasesLabel}>
          {phases.map((p, i) => (
            <li key={p.title}>
              <button
                type="button"
                className="lab-phase"
                aria-current={i === phase ? "step" : undefined}
                onClick={() => choosePhase(i)}
              >
                <span className="lab-phase-number numerals" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {p.title}
              </button>
            </li>
          ))}
        </ol>

        {live ? (
          <div className="lab-group" role="group" aria-label={labels.viewLabel}>
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                className="lab-toggle lab-toggle--small"
                aria-pressed={v === view}
                onClick={() => chooseView(v)}
              >
                {labels.views[v]}
              </button>
            ))}
          </div>
        ) : null}
        <p className="lab-note">{labels.modelNote}</p>
      </div>
    </div>
  );
}
