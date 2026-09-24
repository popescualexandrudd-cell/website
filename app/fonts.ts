import { Cormorant_Garamond, Hanken_Grotesk } from "next/font/google";

/**
 * Both families are downloaded at build time and served from our own origin
 * (no request reaches Google at runtime). The latin-ext subset carries the
 * Romanian comma-below letters ș ț Ș Ț (U+0218–U+021B).
 */
export const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cormorant",
});

export const sans = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-hanken",
});

export const fontVariables = `${display.variable} ${sans.variable}`;
