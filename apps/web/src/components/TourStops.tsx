"use client";

/**
 * The stops of the club tour (§9.2.3) beside the club plan: while the reader scrolls, the stop in
 * the middle of the screen is lit on the plan and the "you are here" dot moves to it. Without
 * JavaScript, or with reduced motion, the stops read as a plain ordered list next to the plan.
 */
import { type ReactNode, useEffect, useRef, useState } from "react";

type Area = readonly [x: number, y: number, width: number, height: number];

/** Where each stop is on the club plan (`SitePlan`, viewBox 900 × 640): its areas and its dot. */
export const STOPS = {
  parking: { areas: [[30, 514, 360, 110], [514, 30, 356, 80]], dot: [210, 569] },
  alley: { areas: [[420, 0, 64, 640]], dot: [452, 470] },
  reception: { areas: [[40, 394, 340, 48]], dot: [125, 418] },
  courts: { areas: [[48, 48, 324, 304]], dot: [125, 113] },
  gallery: { areas: [[40, 184, 340, 32]], dot: [300, 200] },
  cafe: { areas: [[40, 360, 340, 28]], dot: [300, 374] },
  pilates: { areas: [[514, 130, 356, 220]], dot: [692, 290] },
  events: { areas: [[514, 370, 356, 190]], dot: [692, 440] },
} as const satisfies Record<string, { areas: readonly Area[]; dot: readonly [number, number] }>;

export type StopKey = keyof typeof STOPS;
export type Stop = { key: StopKey; title: string; text: string };

export function TourStops({ plan, note, stops }: { plan: ReactNode; note: string; stops: Stop[] }) {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // A stop is "here" while it crosses the middle band of the screen.
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const item of items.current) if (item) seen.observe(item);
    return () => seen.disconnect();
  }, []);

  const here = STOPS[stops[active]?.key ?? "parking"];
  return (
    <div className="tour__layout">
      <figure className="tour__plan">
        <div className="tour__stage">
          {plan}
          <svg className="tour__overlay" viewBox="0 0 900 640" aria-hidden="true" focusable="false">
            {here.areas.map(([x, y, width, height]) => (
              <rect key={`${x}-${y}`} className="tour__area" x={x} y={y} width={width} height={height} />
            ))}
            <circle className="tour__dot" r="11" style={{ transform: `translate(${here.dot[0]}px, ${here.dot[1]}px)` }} />
          </svg>
        </div>
        <figcaption className="muted">{note}</figcaption>
      </figure>
      <ol className="tour__stops">
        {stops.map((stop, i) => (
          <li
            key={stop.key}
            ref={(item) => {
              items.current[i] = item;
            }}
            data-index={i}
            className="tour__stop"
            aria-current={i === active ? "step" : undefined}
          >
            <span className="tour__number" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="tour__title">{stop.title}</h3>
            <p>{stop.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
