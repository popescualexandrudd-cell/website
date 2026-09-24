import { execSync } from "node:child_process";
import { config } from "dotenv";
import pg from "pg";
import { testDatabaseUrl } from "./test-db";

/** Creates the test database if needed, applies migrations and seeds it (idempotent). */
export default async function setup(): Promise<void> {
  config({ path: ".env", quiet: true });
  const url = testDatabaseUrl();
  const target = new URL(url);
  const dbName = target.pathname.replace(/^\//, "");
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${dbName.replace(/"/g, "")}"`);
  await client.end();
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "ignore" });
}
