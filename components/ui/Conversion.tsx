"use client";

import { useEffect, useRef } from "react";
import { currentAttribution, track, type ConversionEvent } from "@/lib/analytics/client";

/**
 * Hidden field with where the visitor came from (campaign, search, social), filled in the
 * browser; the server stores it with the request so the admin can count results per campaign.
 */
export function AttributionField() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.value = currentAttribution();
  }, []);
  return <input ref={ref} type="hidden" name="attribution" defaultValue="" />;
}

/** Records a conversion once, when a form has been sent successfully. */
export function useConversion(done: boolean, event: ConversionEvent) {
  const sent = useRef(false);
  useEffect(() => {
    if (done && !sent.current) {
      sent.current = true;
      track(event);
    }
    if (!done) sent.current = false;
  }, [done, event]);
}
