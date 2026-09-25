import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

export const TODO = "[DE COMPLETAT]";

const scalar = z.union([z.string(), z.number(), z.boolean()]).nullable().optional();
/** A text given once (Romanian) or in both languages: { ro: "…", en: "…" }. */
const localized = z.union([scalar, z.object({ ro: scalar, en: scalar })]);
const certification = z.union([
  scalar,
  z.object({ titlu: localized, emitent: scalar, an: scalar }),
]);

const coach = z.object({
  nume: scalar,
  /** false = the coach is added to the admin but not shown on the site until confirmed. */
  publicat: scalar,
  rol: localized,
  titulatura: localized,
  rezumat: localized,
  specializari: z.array(localized).default([]),
  ani_experienta: scalar,
  certificari: z.array(certification).default([]),
  limbi_vorbite: z.array(scalar).default([]),
  parcurs: localized,
  rezultate_elevi: localized,
});

const configSchema = z.object({
  club: z.object({
    nume: scalar,
    monograma: scalar,
    descriere: localized,
    culori: z.object({ principala: scalar, accent: scalar }).optional(),
    infiintat: scalar,
  }),
  antrenori: z.array(coach).min(1),
  contact: z.object({
    telefon: scalar,
    whatsapp: scalar,
    email: scalar,
    instagram: scalar,
    facebook: scalar,
    tiktok: scalar,
  }),
  locatii: z
    .array(
      z.object({
        nume: scalar,
        adresa: scalar,
        cod_postal: scalar,
        localitate: scalar,
        judet: scalar,
        coordonate: scalar,
        terenuri: z
          .array(
            z.object({
              suprafata: scalar,
              numar: scalar,
              acoperit_iarna: scalar,
              nocturna: scalar,
            }),
          )
          .default([]),
        dotari: z.array(scalar).default([]),
      }),
    )
    .min(1),
  programe: z.array(z.object({ nume: scalar })).default([]),
  academie_juniori: z
    .object({
      grupe: z
        .array(
          z.object({
            etapa: scalar,
            varsta: scalar,
            program: scalar,
            sedinte_pe_saptamana: scalar,
            durata_min: scalar,
            zile_ore: scalar,
            taxa_lunara_ron: scalar,
            locuri: scalar,
          }),
        )
        .default([]),
    })
    .default({ grupe: [] }),
  lectii: z
    .array(
      z.object({
        nume: scalar,
        persoane: scalar,
        durate_min: z.array(scalar).default([60, 90, 120]),
        tarif_ora_ron: scalar,
        tarif_pe: scalar,
      }),
    )
    .default([]),
  pachete: z
    .array(z.object({ nume: scalar, pret_ron: scalar, valabilitate_zile: scalar }))
    .default([]),
  servicii_incluse: z.array(scalar).default([]),
  /** When the club is open (court hire); falls back to the lesson hours when missing. */
  program_club: z.object({ zilnic: scalar }).optional(),
  inchiriere: z.object({ tarife: scalar }).optional(),
  program_lucru: z.object({ luni_vineri: scalar, sambata: scalar, duminica: scalar }),
  rezervari: z.object({
    mod: scalar,
    anulare_gratuita_ore: scalar,
    rezervare_minim_ore_inainte: scalar,
    orizont_zile: scalar,
    pauza_intre_lectii_min: scalar,
    prima_lectie: scalar,
  }),
  plata: z.object({ metode: z.array(scalar).default([]), plata_online_stripe: scalar }),
  site: z.object({
    domeniu: scalar,
    limbi: z.array(scalar).default(["ro"]),
    fus_orar: scalar,
    moneda: scalar,
  }),
  entitate_legala: z.object({ forma: scalar, denumire: scalar, cui: scalar, sediu: scalar }),
});

export type RawConfig = z.infer<typeof configSchema>;
type Scalar = z.infer<typeof scalar>;
export type Localized = z.infer<typeof localized>;
export type CertificationEntry = z.infer<typeof certification>;
export type CoachEntry = z.infer<typeof coach>;

export function loadConfig(path = join(process.cwd(), "config", "club.yml")): RawConfig {
  const text = readFileSync(path, "utf8");
  return configSchema.parse(parse(text));
}

/** A value the client has not filled yet: still wrapped in square brackets, or empty. */
export function isPlaceholder(value: Scalar): boolean {
  if (value === null || value === undefined) return true;
  const text = String(value).trim();
  return text.length === 0 || /^\[.*\]$/s.test(text);
}

/** Optional fields ("[opțional: …]", "[url sau gol]") become empty rather than a visible marker. */
function isOptionalPlaceholder(value: Scalar): boolean {
  if (!isPlaceholder(value)) return false;
  const text = String(value ?? "").toLowerCase();
  return text.length === 0 || text.includes("opțional") || text.includes("sau gol");
}

/** Text with a visible [DE COMPLETAT] marker when missing. */
export function text(value: Scalar): string {
  return isPlaceholder(value) ? TODO : String(value).trim();
}

/** A localized config value as { ro, en }; English falls back to the Romanian text. */
export function localizedText(value: Localized, fallbackEn?: string): { ro: string; en: string } {
  if (value !== null && typeof value === "object") {
    const ro = text(value.ro);
    return { ro, en: isPlaceholder(value.en) ? (fallbackEn ?? ro) : String(value.en).trim() };
  }
  const ro = text(value);
  return { ro, en: fallbackEn ?? ro };
}

/** Optional localized text: null when the Romanian value is an optional placeholder. */
export function optionalLocalized(value: Localized): { ro: string; en: string } | null {
  const ro = value !== null && typeof value === "object" ? value.ro : value;
  if (isOptionalPlaceholder(ro)) return null;
  return localizedText(value);
}

/** Text that stays empty (null) when missing and optional. */
export function optionalText(value: Scalar): string | null {
  if (isOptionalPlaceholder(value)) return null;
  return text(value);
}

export function integer(value: Scalar): number | null {
  if (isPlaceholder(value)) return null;
  const parsed = Number.parseInt(String(value).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function decimal(value: Scalar): string | null {
  if (isPlaceholder(value)) return null;
  const normalized = String(value).replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : null;
}

export function yesNo(value: Scalar): boolean | null {
  if (isPlaceholder(value)) return null;
  const normalized = String(value).trim().toLowerCase();
  if (["da", "yes", "true"].includes(normalized)) return true;
  if (["nu", "no", "false"].includes(normalized)) return false;
  return null;
}

export function coordinates(value: Scalar): { lat: number; lng: number } | null {
  if (isPlaceholder(value)) return null;
  const parts = String(value)
    .split(",")
    .map((part) => Number.parseFloat(part.trim()));
  const [lat, lng] = parts;
  if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng))
    return null;
  return { lat, lng };
}

/** "07:00–21:00" → { start: "07:00", end: "21:00" }; "închis" → null. */
export function hoursRange(value: Scalar): { start: string; end: string } | null {
  if (isPlaceholder(value)) return null;
  const match = String(value).match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, h1, m1, h2, m2] = match;
  const pad = (n: string | undefined) => (n ?? "0").padStart(2, "0");
  return { start: `${pad(h1)}:${m1}`, end: `${pad(h2)}:${m2}` };
}

/** A colour as #rrggbb (lower case), or null when missing or not a hex colour. */
export function hexColor(value: Scalar): string | null {
  if (isPlaceholder(value)) return null;
  const match = String(value)
    .trim()
    .match(/^#?([0-9a-f]{6})$/i);
  return match ? `#${match[1]!.toLowerCase()}` : null;
}

/** "8-10" → { min: 8, max: 10 }; "12" → { min: 12, max: 12 }; missing → nulls. */
export function ageRange(value: Scalar): { min: number | null; max: number | null } {
  if (isPlaceholder(value)) return { min: null, max: null };
  const match = String(value).match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (!match) return { min: null, max: null };
  const min = Number(match[1]);
  return { min, max: match[2] ? Number(match[2]) : min };
}

/** Digits-only international number for wa.me links ("0722 501 748" → "40722501748"), or null. */
export function phoneDigits(value: Scalar): string | null {
  if (isPlaceholder(value)) return null;
  let digits = String(value).replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.length === 10 && digits.startsWith("0")) digits = `40${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}
