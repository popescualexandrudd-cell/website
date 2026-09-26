import { z } from "zod";
import type { Attribution } from "./attribution-visit";

export { attributionFromVisit, type Attribution } from "./attribution-visit";

const text = (max: number) =>
  z
    .string()
    .transform((value) => value.trim().slice(0, max))
    .optional();

export const attributionSchema = z.object({
  source: z.string().trim().min(1).max(100),
  medium: z.string().trim().min(1).max(100),
  campaign: text(150),
  term: text(150),
  content: text(150),
  adClick: z.enum(["google", "meta", "microsoft"]).optional(),
  landing: text(300),
});

/** Reads the hidden form field; anything malformed is simply not recorded. */
export function parseAttributionField(value: unknown): Attribution | null {
  if (typeof value !== "string" || !value || value.length > 2000) return null;
  try {
    const parsed = attributionSchema.safeParse(JSON.parse(value));
    if (!parsed.success) return null;
    const clean = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined && v !== ""),
    );
    return clean as Attribution;
  } catch {
    return null;
  }
}

/** "google / cpc · primavara-copii" for tables in the admin. */
export function attributionLabel(value: unknown): string | null {
  const parsed = attributionSchema.safeParse(value);
  if (!parsed.success) return null;
  const a = parsed.data;
  return `${a.source} / ${a.medium}${a.campaign ? ` · ${a.campaign}` : ""}`;
}
