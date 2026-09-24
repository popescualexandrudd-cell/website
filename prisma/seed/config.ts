import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

export const TODO = "[DE COMPLETAT]";

const scalar = z.union([z.string(), z.number(), z.boolean()]).nullable().optional();

const configSchema = z.object({
  antrenor: z.object({
    nume: scalar,
    titulatura: scalar,
    ani_experienta: scalar,
    certificari: z.array(scalar).default([]),
    limbi_vorbite: z.array(scalar).default([]),
    parcurs: scalar,
    rezultate_elevi: scalar,
  }),
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
        localitate: scalar,
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
  programe: z.array(z.record(z.string(), scalar)).default([]),
  pachete: z
    .array(z.object({ nume: scalar, pret_ron: scalar, valabilitate_zile: scalar }))
    .default([]),
  servicii_incluse: z.array(scalar).default([]),
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

export function loadConfig(path = join(process.cwd(), "config", "antrenor.yml")): RawConfig {
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

/** Digits-only international number for wa.me links, or null if missing. */
export function phoneDigits(value: Scalar): string | null {
  if (isPlaceholder(value)) return null;
  const digits = String(value).replace(/[^\d]/g, "");
  return digits.length >= 8 ? digits : null;
}
