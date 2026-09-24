type Props = { letters: string; className?: string };

/** The coach's initials in a thin ring; a small gold ball until the name is filled in. */
export function Monogram({ letters, className }: Props) {
  const clean = letters.replace(/[^\p{L}]/gu, "").slice(0, 3);
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="22.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      {clean ? (
        <text
          x="24"
          y="24"
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          style={{ fontFamily: "var(--font-display)", fontSize: clean.length > 2 ? 15 : 19, letterSpacing: "0.02em" }}
        >
          {clean}
        </text>
      ) : (
        <g>
          <circle cx="24" cy="24" r="8" fill="url(#monogramBall)" />
          <defs>
            <radialGradient id="monogramBall" cx="0.36" cy="0.32" r="0.72">
              <stop offset="0" stopColor="#FFF6CF" />
              <stop offset="0.2" stopColor="#F4DC8A" />
              <stop offset="0.6" stopColor="#C9A13B" />
              <stop offset="1" stopColor="#6E5214" />
            </radialGradient>
          </defs>
        </g>
      )}
    </svg>
  );
}
