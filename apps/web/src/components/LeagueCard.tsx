"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import * as tokens from "@jungle/design-tokens/tokens";
import { CARD_TIERS, type CardTier } from "@/lib/site";

const MemberCardScene = dynamic(() => import("./MemberCardScene"), { ssr: false });

const SWATCH: Record<CardTier, string> = {
  silver: tokens.ColorMetalSilver,
  gold: tokens.ColorMetalGold,
  platinum: tokens.ColorMetalPlatinum,
  diamond: tokens.ColorNavy900,
};

/**
 * The member card and its status tiers. The tier buttons work with keyboard, touch and without
 * WebGL (the static render changes too); scrolling walks through the tiers until a tier is chosen.
 */
export function LeagueCard() {
  const t = useTranslations("web.league");
  const [tier, setTier] = useState<CardTier>("silver");
  const chosen = useRef(false);
  const onScrollTier = useCallback((next: CardTier) => {
    if (!chosen.current) setTier(next);
  }, []);
  const labels = {
    brand: "Jungle Padel",
    member: t("cardMember"),
    tiers: Object.fromEntries(CARD_TIERS.map((k) => [k, t(`tiers.${k}`)])) as Record<CardTier, string>,
  };
  return (
    <div>
      <div className="card-stage">
        {/* eslint-disable-next-line @next/next/no-img-element -- our own pre-sized WebP render, swapped per tier */}
        <img src={`/renders/card-${tier}.webp`} alt={t("cardAlt")} width={1150} height={918} loading="lazy" decoding="async" />
        <MemberCardScene tier={tier} labels={labels} onScrollTier={onScrollTier} />
      </div>
      <ul className="tiers" aria-label={t("tiersLabel")}>
        {CARD_TIERS.map((key) => (
          <li key={key}>
            <button
              type="button"
              aria-pressed={tier === key}
              style={{ "--swatch": SWATCH[key] } as CSSProperties}
              onClick={() => {
                chosen.current = true;
                setTier(key);
              }}
            >
              <i aria-hidden="true" />
              {t(`tiers.${key}`)}
            </button>
          </li>
        ))}
      </ul>
      <p className="muted">{t("tierHint")}</p>
    </div>
  );
}
