import { ImageResponse } from "next/og";
import * as tokens from "@jungle/design-tokens/tokens";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Jungle Padel";

// Social-media preview image, generated from the brand tokens (no photos yet).
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === "en";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 88,
          background: `linear-gradient(160deg, ${tokens.ColorSurface0} 0%, ${tokens.ColorSurface100} 60%, ${tokens.ColorNavy100} 100%)`,
          color: tokens.ColorNavy900,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 28, letterSpacing: 8, color: tokens.ColorEmerald700 }}>
          <div style={{ width: 48, height: 2, background: tokens.ColorMetalChampagne, marginRight: 20 }} />
          JUNGLE PADEL
        </div>
        <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.04, marginTop: 28, letterSpacing: -3, maxWidth: 980 }}>
          {en ? "Watch the game from three metres up." : "Priveste jocul de la trei metri inaltime."}
        </div>
        <div style={{ fontSize: 32, marginTop: 36, color: tokens.ColorInk700 }}>
          {en ? "Indoor padel · Pantelimon · Opening March 2027" : "Padel indoor · Pantelimon · Deschidere martie 2027"}
        </div>
      </div>
    ),
    size,
  );
}
