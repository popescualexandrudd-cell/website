import * as tokens from "@jungle/design-tokens/tokens";

/** Provisional mark (ADR-0020, §15.4): a navy tile, a champagne ball seam and an emerald leaf. Final logo: owner's choice. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="11" fill={tokens.ColorNavy900} />
      <circle cx="20" cy="20" r="11.5" fill="none" stroke={tokens.ColorMetalGold} strokeWidth="1.6" />
      <path d="M11.5 25.5c5.5-.6 10-4.6 11.6-10.4 2.8.9 4.9 3 5.4 6-4.9 3.6-11 5-17 4.4z" fill={tokens.ColorEmerald600} />
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
