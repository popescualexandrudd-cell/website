import { NextResponse, NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { campaignConfig, campaignCspSources } from "./lib/campaigns";

const handleI18nRouting = createIntlMiddleware(routing);

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const turnstile = Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
  const umamiOrigin = originOf(process.env.UMAMI_SCRIPT_URL);
  // Loaded only after the visitor's consent; the policy allows them when they are configured.
  const campaigns = campaignCspSources(campaignConfig());

  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isDev) scriptSrc.push("'unsafe-eval'");
  if (turnstile) scriptSrc.push("https://challenges.cloudflare.com");
  if (umamiOrigin) scriptSrc.push(umamiOrigin);
  scriptSrc.push(...campaigns.script);

  const connectSrc = ["'self'"];
  if (umamiOrigin) connectSrc.push(umamiOrigin);
  connectSrc.push(...campaigns.connect);
  if (isDev) connectSrc.push("ws:");

  const frameSrc = ["https://www.openstreetmap.org"];
  if (turnstile) frameSrc.push("https://challenges.cloudflare.com");
  frameSrc.push(...campaigns.frame);

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    ["img-src 'self' blob: data:", ...campaigns.img].join(" "),
    "font-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
    `frame-src ${frameSrc.join(" ")}`,
    "worker-src 'self' blob:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const isAdmin =
    request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/");

  let response: NextResponse;
  if (isAdmin) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store");
  } else {
    const forwarded = new NextRequest(request, { headers: requestHeaders });
    response = handleI18nRouting(forwarded);
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Prefetches must pass through too: the locale rewrite (/programe → /ro/programe) happens here.
  matcher: [
    "/((?!api|_next/static|_next/image|media|art|fonts|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico|txt|xml|ics)$).*)",
  ],
};
