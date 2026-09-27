/** Site-wide constants. Only facts confirmed in docs/ (no invented prices, numbers or reviews). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
export const INDEXABLE = process.env.SITE_INDEXABLE === "true";

export const FACTS = {
  courts: 4, // §2.2
  reformersAtOpening: 4, // R-100
  parking: 28, // §2.2: 18 + 10
  seasonMonths: 3, // §6.13
} as const;

export const ADDRESS = {
  street: "Șoseaua Biruinței",
  locality: "Pantelimon",
  region: "Ilfov",
  country: "RO",
} as const;

export const MAP_URL = "https://www.openstreetmap.org/search?query=Selgros%20Pantelimon";
