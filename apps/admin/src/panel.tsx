/** What every module of the panel shares: the API, the language, the staff member's
 * permissions at the chosen location, messages. The panel hides what a person may not use;
 * the server checks every action again (ADR-0011). */
import { createContext, useContext } from "react";
import type { AdminApi, Permissions } from "./api";
import type { Lang } from "./i18n";
import { t } from "./i18n";

export type Panel = {
  api: AdminApi;
  lang: Lang;
  permissions: Permissions;
  locationId: string;
  can: (action: string) => boolean;
  notify: (text: string, kind?: "ok" | "error") => void;
  fail: (error: unknown) => void;
  go: (route: string) => void;
  /** What follows the module in the address: `#/users/<id>` gives `["<id>"]`. */
  path: string[];
};

export const PanelContext = createContext<Panel | null>(null);

export function usePanel(): Panel {
  const panel = useContext(PanelContext);
  if (!panel) throw new Error("PanelContext missing");
  return panel;
}

export function useT(): (key: string, params?: Record<string, unknown>) => string {
  const { lang } = usePanel();
  return (key, params) => t(lang, key, params);
}

/** The actions allowed at a location (a role without a location counts everywhere). */
export function actionsAt(permissions: Permissions, locationId: string): Set<string> {
  return new Set(permissions.scopes.find((s) => s.location_id === locationId)?.actions ?? []);
}

/** The slug of the chosen location (public reads take it: prices, options). */
export function locationSlug(permissions: Permissions, locationId: string): string {
  return permissions.scopes.find((s) => s.location_id === locationId)?.location_slug ?? "";
}
