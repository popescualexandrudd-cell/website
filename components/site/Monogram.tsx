type Props = { letters: string; className?: string };

/** The coach's initials on a clay disc with a ball-yellow ring; a ball until the name is set. */
export function Monogram({ letters, className }: Props) {
  const clean = letters.replace(/[^\p{L}]/gu, "").slice(0, 3);
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="23" fill="#B94C22" />
      <circle cx="24" cy="24" r="20.5" fill="none" stroke="#F2B134" strokeWidth="1.5" />
      {clean ? (
        <text
          x="24"
          y="25"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFF7EE"
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
        <circle cx="24" cy="24" r="8" fill="#D9E453" />
      )}
    </svg>
  );
}
