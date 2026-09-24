import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "Antrenor de tenis <rezervari@localhost>";
}
