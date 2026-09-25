"use client";

import { useId, useState } from "react";
import { campaignUrl } from "@/lib/admin/campaigns";

type Props = { pages: { label: string; url: string }[] };

const SOURCES = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "tiktok", label: "TikTok" },
  { value: "newsletter", label: "Newsletter (email)" },
  { value: "afis", label: "Afiș sau flyer (cod QR)" },
];

const MEDIUMS = [
  { value: "paid_social", label: "reclamă plătită pe rețele" },
  { value: "social", label: "postare obișnuită" },
  { value: "cpc", label: "reclamă Google (plată pe clic)" },
  { value: "email", label: "email" },
  { value: "qr", label: "cod QR" },
];

/**
 * Builds a link with UTM tags for a post, an ad or a QR code, so the visits and the bookings it
 * brings show up under the campaign's name in the report above.
 */
export function CampaignLinkBuilder({ pages }: Props) {
  const id = useId();
  const [page, setPage] = useState(pages[0]?.url ?? "");
  const [source, setSource] = useState("facebook");
  const [medium, setMedium] = useState("paid_social");
  const [campaign, setCampaign] = useState("");
  const [copied, setCopied] = useState(false);
  const url = campaignUrl(page, { source, medium, campaign });

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="field" htmlFor={`${id}-page`}>
          <span className="field-label">Pagina</span>
          <select
            id={`${id}-page`}
            className="input"
            value={page}
            onChange={(e) => setPage(e.target.value)}
          >
            {pages.map((p) => (
              <option key={p.url} value={p.url}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor={`${id}-campaign`}>
          <span className="field-label">Numele campaniei</span>
          <input
            id={`${id}-campaign`}
            className="input"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="de exemplu: inscrieri-toamna"
            maxLength={80}
          />
        </label>
        <label className="field" htmlFor={`${id}-source`}>
          <span className="field-label">Unde apare linkul</span>
          <select
            id={`${id}-source`}
            className="input"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor={`${id}-medium`}>
          <span className="field-label">Ce fel de postare</span>
          <select
            id={`${id}-medium`}
            className="input"
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
          >
            {MEDIUMS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-2">
        <span className="field-label" id={`${id}-result`}>
          Linkul de folosit
        </span>
        <output aria-labelledby={`${id}-result`} className="admin-code">
          {url ?? "Scrie numele campaniei ca să apară linkul."}
        </output>
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={copy}
            disabled={!url}
          >
            {copied ? "Copiat" : "Copiază linkul"}
          </button>
        </div>
      </div>
    </div>
  );
}
