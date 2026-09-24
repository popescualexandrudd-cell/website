type Props = { variant: "match" | "lab"; className?: string };

/**
 * The still image shown before the 3D scene has loaded, and instead of it where WebGL is not
 * available: late sun on a clay court seen from behind the baseline, drawn as vectors (a few
 * hundred bytes, no request).
 */
export function CourtPoster({ variant, className }: Props) {
  const lab = variant === "lab";
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fb0cc" />
          <stop offset="0.75" stopColor="#ecd5b3" />
          <stop offset="1" stopColor="#e8c79f" />
        </linearGradient>
        <linearGradient id={`clay-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8693c" />
          <stop offset="1" stopColor="#b3532b" />
        </linearGradient>
        <radialGradient id={`sun-${variant}`} cx="0.2" cy="0.1" r="0.9">
          <stop offset="0" stopColor="#ffe7c2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffe7c2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#sky-${variant})`} />
      <path
        d="M0 300 Q60 200 110 300 Q150 150 200 300 Q260 220 320 300 Q380 120 430 300 Q500 210 560 300 Q640 140 700 300 Q760 230 820 300 Q880 150 940 300 Q1000 210 1060 300 Q1130 130 1190 300 Q1250 220 1310 300 Q1380 160 1440 300 Q1500 210 1560 300 L1600 300 L1600 380 L0 380 Z"
        fill="#56603c"
        opacity="0.85"
      />
      <rect y="330" width="1600" height="90" fill="#294433" />
      <rect y="410" width="1600" height="490" fill={`url(#clay-${variant})`} />
      {lab ? (
        <g fill="none" stroke="#f3ece2" strokeWidth="6">
          <path d="M-100 760 L1700 700" />
          <path d="M980 900 L1080 410" opacity="0.8" />
        </g>
      ) : (
        <g fill="none" stroke="#f3ece2" strokeLinejoin="round">
          <path d="M620 430 L980 430 L1500 900 L100 900 Z" strokeWidth="5" />
          <path d="M665 430 L240 900 M935 430 L1360 900" strokeWidth="4" />
          <path d="M560 520 L1040 520 M372 690 L1228 690" strokeWidth="4" />
          <path d="M800 520 L800 690" strokeWidth="4" />
          <path d="M500 470 L1100 470" stroke="#1c1c1c" strokeWidth="26" opacity="0.55" />
          <path d="M500 458 L1100 458" strokeWidth="5" />
        </g>
      )}
      <rect width="1600" height="900" fill={`url(#sun-${variant})`} />
    </svg>
  );
}
