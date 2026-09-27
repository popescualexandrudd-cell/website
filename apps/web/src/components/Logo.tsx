import * as tokens from "@jungle/design-tokens/tokens";

/** Provisional mark (ADR-0020, §15.4): a night-navy tile, a brass ball seam and a bone leaf. Final logo: owner's choice. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="11" fill={tokens.ColorNight700} />
      <circle cx="20" cy="20" r="11.5" fill="none" stroke={tokens.ColorBrass400} strokeWidth="1.6" />
      <path d="M11.5 25.5c5.5-.6 10-4.6 11.6-10.4 2.8.9 4.9 3 5.4 6-4.9 3.6-11 5-17 4.4z" fill={tokens.ColorBone50} />
    </svg>
  );
}

export function LogoWord() {
  return (
    <span className="logo-word">
      JUNGLE <span>PADEL</span>
    </span>
  );
}
