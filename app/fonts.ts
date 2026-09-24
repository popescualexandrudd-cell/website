import { Cormorant_Garamond, Hanken_Grotesk } from "next/font/google";

/**
 * Both families are downloaded at build time and served from our own origin
 * (no request reaches Google at runtime). All subsets are declared with unicode-range; only
 * "latin" is preloaded. The latin-ext file (ă ș ț Ș Ț) follows on first use, so the preloads do
 * not compete with the first painting for bandwidth on mobile.
 */
export const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  // Not preloaded: requested as soon as the page's styles need it, without taking bandwidth
  // from the first painting (text shows in the size-adjusted fallback until then).
  preload: false,
  variable: "--font-cormorant",
});

export const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-hanken",
});

export const fontVariables = `${display.variable} ${sans.variable}`;
