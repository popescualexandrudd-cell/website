import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { urls } from "@/lib/paths";
import { googleReviewLink } from "@/lib/reviews";

export const metadata: Metadata = { title: "Coduri QR" };

async function qrDataUrl(url: string): Promise<string> {
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * QR codes to print for the reception desk, the courts and flyers: the club's Google reviews,
 * the gift cards and the amateur league. Each one opens the page directly on the phone.
 */
export default async function QrCodesPage() {
  await requireAdmin("PROPRIETAR");
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: {
      brandName: true,
      googleReviewUrl: true,
      giftCardsEnabled: true,
      leagueEnabled: true,
    },
  });
  const codes = [
    {
      key: "google",
      title: "Lasă-ne o recenzie pe Google",
      note: settings.googleReviewUrl
        ? "Deschide direct fereastra „Scrie o recenzie”."
        : "Deschide clubul pe Google Maps. Pentru fereastra „Scrie o recenzie” direct, pune linkul din Google Business Profile în Setări → Recenzii Google.",
      url: googleReviewLink(settings),
    },
    ...(settings.giftCardsEnabled
      ? [
          {
            key: "gift",
            title: "Oferă o lecție de tenis",
            note: "Pagina cardurilor cadou.",
            url: urls.giftCards("ro"),
          },
        ]
      : []),
    ...(settings.leagueEnabled
      ? [
          {
            key: "league",
            title: "Liga amatorilor",
            note: "Înscrierea în ligă și clasamentul.",
            url: urls.league("ro"),
          },
          {
            key: "partner",
            title: "Găsește partener de joc",
            note: "Jucătorii care caută partener, pe niveluri.",
            url: urls.partner("ro"),
          },
        ]
      : []),
  ];
  const images = await Promise.all(codes.map((code) => qrDataUrl(code.url)));

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-title">Coduri QR</h1>
          <p>
            De tipărit pentru recepție, terenuri și afișe (Ctrl+P sau „Tipărește” din browser).
            Recenziile de pe Google sunt primul lucru pe care îl citesc părinții care caută un club.
            Invitația la recenzie pleacă și automat, pe email, după prima lecție efectuată (
            <Link href="/admin/setari">Setări → Funcții</Link>).
          </p>
        </div>
      </div>
      <ul className="qr-grid">
        {codes.map((code, index) => (
          <li key={code.key} className="qr-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- a generated data URL */}
            <img src={images[index]} alt={`Cod QR: ${code.title}`} width={220} height={220} />
            <h2 className="qr-title">{code.title}</h2>
            <p className="qr-brand">{settings.brandName}</p>
            <p className="qr-note">{code.note}</p>
            <p className="qr-url">{code.url}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
