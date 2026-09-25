import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { isFilled, t } from "@/lib/i18n-content";
import { brandColors } from "@/lib/color";

const FONT_DIR = join(process.cwd(), "node_modules", "@fontsource", "barlow-condensed", "files");
const LEGAL: Record<string, "CONFIDENTIALITATE" | "TERMENI" | "COOKIES"> = {
  confidentialitate: "CONFIDENTIALITATE",
  termeni: "TERMENI",
  cookies: "COOKIES",
};

let fonts: Promise<{ name: string; data: Buffer; weight: 700; style: "normal" }[]> | null = null;

function loadFonts() {
  fonts ??= Promise.all(
    (["latin", "latin-ext"] as const).map(async (subset) => ({
      // Separate names per subset: Satori falls back glyph by glyph across the family list.
      name: subset === "latin" ? "Barlow" : "BarlowExt",
      data: await readFile(join(FONT_DIR, `barlow-condensed-${subset}-700-normal.woff`)),
      weight: 700 as const,
      style: "normal" as const,
    })),
  );
  return fonts;
}

/** Title and subtitle for a public page, looked up by its Romanian path; never from the query text. */
async function describe(path: string, lang: "ro" | "en") {
  const settings = await db.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
  const brand = isFilled(settings.brandName) ? settings.brandName : t(settings.tagline, lang);
  const colors = brandColors(settings);
  const fallback = {
    title: t(settings.seoTitle, lang),
    subtitle: t(settings.tagline, lang),
    brand,
    colors,
  };
  const [first, second] = path.split("/").filter(Boolean);
  if (!first) return fallback;
  if (first === "programe" && second) {
    const program = await db.program.findUnique({ where: { slug: second } });
    return program?.active
      ? { title: t(program.name, lang), subtitle: t(program.summary, lang), brand, colors }
      : fallback;
  }
  if (first === "echipa" && second) {
    const coach = await db.coach.findUnique({ where: { slug: second } });
    return coach?.active
      ? { title: coach.name, subtitle: t(coach.role, lang), brand, colors }
      : fallback;
  }
  if (first === "sfaturi" && second) {
    const post = await db.post.findUnique({ where: { slug: second } });
    return post?.status === "PUBLICAT"
      ? { title: t(post.title, lang), subtitle: t(post.excerpt, lang), brand, colors }
      : fallback;
  }
  const legal = LEGAL[first];
  if (legal) {
    const page = await db.legalPage.findUnique({ where: { kind: legal } });
    return page ? { title: t(page.title, lang), subtitle: brand, brand, colors } : fallback;
  }
  const header = await db.pageHeader.findUnique({ where: { key: first } });
  return header
    ? { title: t(header.title, lang), subtitle: t(header.intro, lang), brand, colors }
    : fallback;
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : clean;
}

/**
 * Open Graph image (1200×630) for social previews: condensed capitals on the club's dark colour,
 * an accent band and a tennis ball.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = (url.searchParams.get("path") ?? "/").slice(0, 200);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "ro";
  const { title, subtitle, brand, colors } = await describe(path, lang);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: colors.brand,
        backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.35) 100%)",
        color: "#FBFAF7",
        fontFamily: "BarlowExt, Barlow",
        padding: "64px 72px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 14,
          background: colors.accent,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: "#EEF5A8",
          }}
        >
          {clip(brand, 60)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 860 }}>
          <div
            style={{
              fontSize: title.length > 60 ? 76 : 96,
              lineHeight: 0.95,
              textTransform: "uppercase",
            }}
          >
            {clip(title, 110)}
          </div>
          {subtitle ? (
            <div
              style={{
                marginTop: 28,
                fontSize: 34,
                lineHeight: 1.2,
                color: "rgba(251,250,247,0.88)",
              }}
            >
              {clip(subtitle, 140)}
            </div>
          ) : null}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 80,
          top: 72,
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundImage:
            "radial-gradient(circle at 35% 30%, #F5F9C4 0%, #D9E84A 55%, #9FAA2A 100%)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
        }}
      />
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: await loadFonts(),
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    },
  );
}
