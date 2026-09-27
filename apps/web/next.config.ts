import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC ?? "";
const umamiOrigin = umamiSrc ? new URL(umamiSrc).origin : "";

// Strict security headers (§12.1). Next.js needs inline scripts for hydration and inline styles.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${umamiOrigin}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${new URL(apiUrl).origin} ${umamiOrigin}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: csp }] : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  poweredByHeader: false,
  reactStrictMode: true,
  // Inline the (small) CSS into the HTML: no render-blocking stylesheet request on mobile.
  experimental: { inlineCss: true },
  transpilePackages: ["@jungle/api-client", "@jungle/design-tokens", "@jungle/i18n"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
