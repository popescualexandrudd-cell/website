import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { isFilled, t } from "@/lib/i18n-content";

const FONT_DIR = join(process.cwd(), "node_modules", "@fontsource", "cormorant-garamond", "files");
const LEGAL: Record<string, "CONFIDENTIALITATE" | "TERMENI" | "COOKIES"> = {
  confidentialitate: "CONFIDENTIALITATE",
  termeni: "TERMENI",
  cookies: "COOKIES",
};

let fonts: Promise<
  { name: string; data: Buffer; weight: 400 | 500; style: "normal" | "italic" }[]
> | null = null;

function loadFonts() {
  fonts ??= Promise.all(
    (
      [
        ["latin", 500, "normal"],
        ["latin-ext", 500, "normal"],
        ["latin", 400, "italic"],
        ["latin-ext", 400, "italic"],
      ] as const
    ).map(async ([subset, weight, style]) => ({
      // Separate names per subset: Satori falls back glyph by glyph across the family list.
      name: subset === "latin" ? "Cormorant" : "CormorantExt",
      data: await readFile(join(FONT_DIR, `cormorant-garamond-${subset}-${weight}-${style}.woff`)),
      weight,
      style,
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

/** Open Graph image (1200×630) for social previews: typographic, with the golden ball. */
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
        background: "#ECE3CF",
        color: "#1D1A15",
        fontFamily: "CormorantExt, Cormorant",
        padding: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          border: "1px solid rgba(29,26,21,0.35)",
          padding: "56px 64px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#4A4338",
          }}
        >
          {clip(brand, 60)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
          <div style={{ fontSize: title.length > 60 ? 64 : 80, fontWeight: 500, lineHeight: 1.05 }}>
            {clip(title, 110)}
          </div>
          {subtitle ? (
            <div
              style={{
                marginTop: 24,
                fontSize: 32,
                fontStyle: "italic",
                fontWeight: 400,
                color: "#4A4338",
                lineHeight: 1.25,
              }}
            >
              {clip(subtitle, 140)}
            </div>
          ) : null}
        </div>
        <div
          style={{
            position: "absolute",
            right: 72,
            bottom: 72,
            width: 132,
            height: 132,
            borderRadius: 66,
            backgroundImage:
              "radial-gradient(circle at 36% 32%, #FFF6CF 0%, #F4DC8A 20%, #C9A13B 58%, #6E5214 100%)",
            boxShadow: "0 18px 40px rgba(110,82,20,0.35)",
          }}
        />
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: await loadFonts(),
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    },
  );
}
