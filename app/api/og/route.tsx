import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { isFilled, t } from "@/lib/i18n-content";

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
  const fallback = {
    title: t(settings.seoTitle, lang),
    subtitle: t(settings.tagline, lang),
    brand,
  };
  const [first, second] = path.split("/").filter(Boolean);
  if (!first) return fallback;
  if (first === "programe" && second) {
    const program = await db.program.findUnique({ where: { slug: second } });
    return program?.active
      ? { title: t(program.name, lang), subtitle: t(program.summary, lang), brand }
      : fallback;
  }
  if (first === "sfaturi" && second) {
    const post = await db.post.findUnique({ where: { slug: second } });
    return post?.status === "PUBLICAT"
      ? { title: t(post.title, lang), subtitle: t(post.excerpt, lang), brand }
      : fallback;
  }
  const legal = LEGAL[first];
  if (legal) {
    const page = await db.legalPage.findUnique({ where: { kind: legal } });
    return page ? { title: t(page.title, lang), subtitle: brand, brand } : fallback;
  }
  const header = await db.pageHeader.findUnique({ where: { key: first } });
  return header
    ? { title: t(header.title, lang), subtitle: t(header.intro, lang), brand }
    : fallback;
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : clean;
}

/** Open Graph image (1200×630) for social previews: condensed capitals on clay, a tennis ball. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = (url.searchParams.get("path") ?? "/").slice(0, 200);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "ro";
  const { title, subtitle, brand } = await describe(path, lang);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "linear-gradient(135deg, #C8693C 0%, #B94C22 55%, #7A2C14 100%)",
        color: "#FFF7EE",
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
          background: "#F2B134",
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
            color: "#FBD98A",
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
                color: "rgba(255,247,238,0.88)",
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
            "radial-gradient(circle at 35% 30%, #F5F9C4 0%, #D9E453 55%, #9FAA2A 100%)",
          boxShadow: "0 18px 40px rgba(42,19,11,0.45)",
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
