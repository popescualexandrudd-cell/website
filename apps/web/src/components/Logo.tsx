/** Provisional logo (ADR-0020, §15.4): a padel ball whose seam is a jungle leaf. Final logo: owner's choice. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="jp-sunset" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF3DA5" />
          <stop offset="0.6" stopColor="#FF8A1F" />
          <stop offset="1" stopColor="#FFD84D" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#jp-sunset)" />
      <path
        d="M11 34c6-1 12-6 15-13 2-5 6-8 11-9-1 7-5 12-10 15-5 4-10 6-16 7z"
        fill="#040C09"
        opacity="0.9"
      />
      <path d="M13 33c7-4 13-10 21-19" stroke="#FFD84D" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function LogoWord() {
  return (
    <span className="logo-word">
      <strong>JUNGLE</strong> <span>PADEL</span>
    </span>
  );
}
