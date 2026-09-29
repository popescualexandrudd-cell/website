/** The panel's modules (§8.6) and the action each needs; the menu shows only what the staff
 * member may use at the chosen location. */
import type { ComponentType } from "react";
import { Dashboard } from "./Dashboard";

export type Module = {
  route: string;
  /** Text key under `admin.nav.*`. */
  label: string;
  /** Any one of these actions opens the module. */
  actions: string[];
  component: ComponentType;
};

export const MODULES: Module[] = [{ route: "dashboard", label: "dashboard", actions: ["bookings.view"], component: Dashboard }];

export function allowed(modules: Module[], can: (action: string) => boolean): Module[] {
  return modules.filter((m) => m.actions.some(can));
}
