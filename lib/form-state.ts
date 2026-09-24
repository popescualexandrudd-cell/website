/** Result of a form server action. Kept free of zod so client components stay small. */
export type FormState = {
  status: "idle" | "success" | "error";
  /** A general error code (rateLimit, captcha, server, conflict…) */
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Extra data for the success view (e.g. booking code, manage URL) */
  data?: Record<string, string>;
};

export const idleState: FormState = { status: "idle" };
