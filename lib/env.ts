import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((value) => value === "true" || value === "1");

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z
    .string({ error: "DATABASE_URL lipsește: adresa bazei de date PostgreSQL." })
    .url("DATABASE_URL trebuie să fie o adresă validă, de forma postgresql://user:parola@host:5432/baza"),
  APP_URL: z
    .string({ error: "APP_URL lipsește: adresa publică a site-ului, de exemplu https://numele-tau-tenis.ro" })
    .url("APP_URL trebuie să fie o adresă completă, cu https://")
    .transform((value) => value.replace(/\/+$/, "")),
  AUTH_SECRET: z
    .string({ error: "AUTH_SECRET lipsește: generează unul cu `openssl rand -base64 48`." })
    .min(32, "AUTH_SECRET trebuie să aibă cel puțin 32 de caractere. Generează unul cu `openssl rand -base64 48`."),
  SMTP_HOST: z.string({ error: "SMTP_HOST lipsește: serverul de email (în dezvoltare: localhost)." }).min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanFromString,
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  EMAIL_FROM: z
    .string({ error: "EMAIL_FROM lipsește: expeditorul emailurilor, de exemplu \"Nume <rezervari@domeniu.ro>\"." })
    .min(3),
  COACH_NOTIFY_EMAIL: optionalString,
  MEDIA_DIR: z.string().default("./storage/media"),
  TRUST_PROXY: booleanFromString.default(true),
  TURNSTILE_SITE_KEY: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,
  UMAMI_SCRIPT_URL: optionalString,
  UMAMI_WEBSITE_ID: optionalString,
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Validates environment variables once, on first use. Fails loudly, listing every
 * missing or invalid variable, so the app refuses to start with a broken config.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => {
      const key = issue.path.join(".") || "(necunoscut)";
      return `  • ${key}: ${issue.message}`;
    });
    const message = [
      "Configurația aplicației nu este validă. Verifică fișierul .env:",
      ...lines,
      "Vezi .env.example pentru explicația fiecărei variabile.",
    ].join("\n");
    throw new Error(message);
  }
  cached = parsed.data;
  return cached;
}

export function isTurnstileEnabled(): boolean {
  const env = getEnv();
  return Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY);
}

export function isUmamiConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.UMAMI_SCRIPT_URL && env.UMAMI_WEBSITE_ID);
}
