import { Barlow_Condensed, Inter } from "next/font/google";

/**
 * Two families, downloaded at build time and served from our own origin (no request reaches
 * Google at runtime). Both declare latin and latin-ext: Romanian headings need ă â î ș ț from
 * the first paint, so both subsets are preloaded.
 *
 * - Barlow Condensed 700: headings, set in capitals like the scoreboards and academy signage
 *   the design borrows from. One weight keeps the download small.
 * - Inter (variable): body text, labels and buttons.
 */
export const display = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["700"],
  display: "swap",
  variable: "--font-barlow",
});

export const sans = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

export const fontVariables = `${display.variable} ${sans.variable}`;
