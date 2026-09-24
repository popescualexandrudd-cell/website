import { z } from "zod";

/** Error codes map to messages in messages/*.json → form.errors.<code>. */
export const fields = {
  name: z.string().trim().min(2, "name").max(120, "name"),
  email: z.string().trim().toLowerCase().max(200, "email").email("email"),
  phone: z
    .string()
    .trim()
    .max(40, "phone")
    .regex(/^\+?[\d\s().-]{8,}$/, "phone")
    .refine(
      (value) => value.replace(/\D/g, "").length >= 8 && value.replace(/\D/g, "").length <= 15,
      "phone",
    ),
  optionalPhone: z
    .string()
    .trim()
    .max(40, "phone")
    .refine(
      (value) =>
        value === "" ||
        (/^\+?[\d\s().-]{8,}$/.test(value) && value.replace(/\D/g, "").length <= 15),
      "phone",
    )
    .transform((value) => (value === "" ? null : value)),
  message: z.string().trim().min(10, "message").max(4000, "message"),
  optionalText: (max: number) =>
    z
      .string()
      .trim()
      .max(max)
      .transform((value) => (value === "" ? null : value)),
  consent: z.literal("on", { error: "consent" }),
  honeypot: z.string().max(0).optional(),
  locale: z.enum(["ro", "en"]).catch("ro"),
};

export { idleState, type FormState } from "./form-state";

export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (out[key]) continue;
    const code = issue.message && /^[a-zA-Z]+$/.test(issue.message) ? issue.message : key;
    out[key] = code;
  }
  return out;
}
