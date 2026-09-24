export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { getEnv } = await import("./lib/env");
  // Throws with a readable list of missing variables; the server refuses to start.
  getEnv();
}
