import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Jungle Padel";

// Social-media preview image, generated from the brand colours (no photos yet).
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const subtitle = locale === "en" ? "Indoor padel · Pantelimon · Opening March 2027" : "Padel indoor · Pantelimon · Deschidere martie 2027";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "radial-gradient(circle at 80% 20%, #FF3DA5 0%, rgba(255,61,165,0) 45%), radial-gradient(circle at 15% 85%, #2BE8D2 0%, rgba(43,232,210,0) 40%), #040C09",
          color: "#F6EBD9",
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 12, color: "#FFD84D" }}>JUNGLE PADEL</div>
        <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1, marginTop: 24 }}>{locale === "en" ? "Enter the jungle." : "Intra in jungla."}</div>
        <div style={{ fontSize: 36, marginTop: 36, color: "#C9D4CB" }}>{subtitle}</div>
      </div>
    ),
    size,
  );
}
