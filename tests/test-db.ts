/** The test suite never touches the development database: it uses "<name>_test" on the same server. */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL lipsește: testele de integrare au nevoie de PostgreSQL (docker-compose.dev.yml).");
  const url = new URL(base);
  const name = url.pathname.replace(/^\//, "") || "tenis";
  url.pathname = `/${name.endsWith("_test") ? name : `${name}_test`}`;
  return url.toString();
}
