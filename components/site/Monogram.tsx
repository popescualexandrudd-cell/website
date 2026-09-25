type Props = { letters: string; className?: string };

/** The club's initials on an accent disc with a ball-yellow ring; a ball until they are set. */
export function Monogram({ letters, className }: Props) {
  const clean = letters.replace(/[^\p{L}]/gu, "").slice(0, 3);
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="23" style={{ fill: "var(--color-zgura)" }} />
      <circle
        cx="24"
        cy="24"
        r="20.5"
        fill="none"
        strokeWidth="1.5"
        style={{ stroke: "var(--color-galben)" }}
      />
      {clean ? (
        <text
          x="24"
          y="25"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FBFAF7"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: clean.length > 2 ? 16 : 20,
            letterSpacing: "0.04em",
          }}
        >
          {clean}
        </text>
      ) : (
        <circle cx="24" cy="24" r="8" style={{ fill: "var(--color-galben)" }} />
      )}
    </svg>
  );
}
