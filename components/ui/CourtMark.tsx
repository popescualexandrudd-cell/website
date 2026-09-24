type Props = { className?: string; variant?: "plan" | "perspective" };

/**
 * A tennis court drawn in white lines, true to ITF proportions: seen from above ("plan"), or
 * from behind the baseline as on a broadcast ("perspective"). Decorative.
 */
export function CourtMark({ className, variant = "perspective" }: Props) {
  if (variant === "plan") {
    // 10.97 × 23.77 m, doubles and singles sidelines, service boxes, net.
    return (
      <svg viewBox="0 0 120 250" className={className} aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="5" y="5" width="110" height="238" />
          <line x1="18.7" y1="5" x2="18.7" y2="243" />
          <line x1="101.3" y1="5" x2="101.3" y2="243" />
          <line x1="18.7" y1="60.2" x2="101.3" y2="60.2" />
          <line x1="18.7" y1="187.8" x2="101.3" y2="187.8" />
          <line x1="60" y1="60.2" x2="60" y2="187.8" />
          <line x1="60" y1="5" x2="60" y2="8" />
          <line x1="60" y1="240" x2="60" y2="243" />
        </g>
        <line x1="-2" y1="124" x2="122" y2="124" stroke="currentColor" strokeWidth="2.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 400 220" className={className} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M150 20 L250 20 L380 210 L20 210 Z" />
        <path d="M162 20 L118 210 M238 20 L282 210" />
        <path d="M135 62 L265 62 M86 150 L314 150" />
        <path d="M200 62 L200 150" />
      </g>
      <path d="M128 92 L272 92" stroke="currentColor" strokeWidth="3" />
      <path
        d="M128 92 L128 78 M272 92 L272 78 M128 78 L272 78"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.6"
      />
    </svg>
  );
}
