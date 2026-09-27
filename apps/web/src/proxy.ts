import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 "proxy" (formerly middleware): locale detection and localised URLs.
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
