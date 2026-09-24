/**
 * `npm run admin:create` — creates (or resets the password of) an admin account, interactively.
 * Non-interactive use (CI, tests):  npm run admin:create -- --email a@b.ro --name "Nume" --password "…" --role PROPRIETAR
 */
import { config } from "dotenv";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "../lib/generated/prisma/client";

config({ quiet: true });

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function problem(password: string): string | null {
  if (password.length < 12) return "Parola trebuie să aibă cel puțin 12 caractere.";
  if (/^[a-zA-ZăâîșțĂÂÎȘȚ]+$/.test(password) || /^\d+$/.test(password))
    return "Folosește și cifre sau semne, nu doar litere sau doar cifre.";
  return null;
}

async function askHidden(prompt: string): Promise<string> {
  if (!input.isTTY) {
    const rl = createInterface({ input, output });
    const answer = await rl.question(prompt);
    rl.close();
    return answer;
  }
  output.write(prompt);
  return new Promise((resolve) => {
    let value = "";
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    const onData = (char: string) => {
      if (char === "\r" || char === "\n") {
        input.setRawMode(false);
        input.pause();
        input.off("data", onData);
        output.write("\n");
        resolve(value);
      } else if (char === "\u0003") {
        process.exit(130);
      } else if (char === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    input.on("data", onData);
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL lipsește din .env");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const interactive = !arg("email");
  const rl = interactive ? createInterface({ input, output }) : null;
  try {
    const count = await db.adminUser.count();
    const email = (arg("email") ?? (await rl!.question("Emailul contului de administrator: ")))
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("Adresa de email nu pare validă.");
    const existing = await db.adminUser.findUnique({ where: { email } });
    const name =
      arg("name") ??
      (existing ? existing.name : (await rl!.question("Numele afișat: ")).trim() || email);
    const roleInput =
      arg("role") ??
      (existing
        ? existing.role
        : count === 0
          ? "PROPRIETAR"
          : (await rl!.question("Rol (PROPRIETAR / EDITOR) [EDITOR]: ")).trim().toUpperCase() ||
            "EDITOR");
    const role = roleInput === "PROPRIETAR" ? "PROPRIETAR" : "EDITOR";
    rl?.close();

    let password = arg("password");
    if (!password) {
      password = await askHidden("Parola (nu se afișează): ");
      const again = await askHidden("Repetă parola: ");
      if (password !== again) throw new Error("Parolele nu coincid.");
    }
    const issue = problem(password);
    if (issue) throw new Error(issue);

    const passwordHash = await hash(password, {
      algorithm: 2 /* Argon2id */,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    if (existing) {
      await db.adminUser.update({
        where: { email },
        data: { passwordHash, name, role, failedLogins: 0, lockedUntil: null },
      });
      await db.session.deleteMany({ where: { userId: existing.id } });
      console.info(`Parola contului ${email} a fost schimbată. Sesiunile vechi au fost închise.`);
    } else {
      await db.adminUser.create({ data: { email, name, role, passwordHash } });
      console.info(`Contul ${email} (${role}) a fost creat. Intră pe /admin/login.`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
