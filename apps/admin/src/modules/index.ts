/** The panel's modules (§8.6) and the action each needs; the menu shows only what the staff
 * member may use at the chosen location. */
import type { ComponentType } from "react";
import { Attendance } from "./Attendance";
import { Cafe } from "./Cafe";
import { Calendar } from "./Calendar";
import { Cash } from "./Cash";
import { Classes } from "./Classes";
import { Corporate } from "./Corporate";
import { Dashboard } from "./Dashboard";
import { League } from "./League";
import { Levels } from "./Levels";
import { Money } from "./Money";
import { Pricing } from "./Pricing";
import { Resources } from "./Resources";
import { Subscriptions } from "./Subscriptions";
import { Users } from "./Users";

export type Module = {
  route: string;
  /** Text key under `admin.nav.*`. */
  label: string;
  /** Any one of these actions opens the module. */
  actions: string[];
  component: ComponentType;
};

export const MODULES: Module[] = [
  { route: "dashboard", label: "dashboard", actions: ["bookings.view"], component: Dashboard },
  { route: "calendar", label: "calendar", actions: ["bookings.view"], component: Calendar },
  { route: "users", label: "users", actions: ["users.view"], component: Users },
  { route: "classes", label: "classes", actions: ["bookings.view", "classes.manage"], component: Classes },
  { route: "attendance", label: "attendance", actions: ["attendance.view", "restrictions.manage"], component: Attendance },
  { route: "subscriptions", label: "subscriptions", actions: ["subscriptions.manage"], component: Subscriptions },
  { route: "corporate", label: "corporate", actions: ["corporate.manage"], component: Corporate },
  { route: "resources", label: "resources", actions: ["resources.manage"], component: Resources },
  { route: "pricing", label: "pricing", actions: ["pricing.manage"], component: Pricing },
  { route: "levels", label: "levels", actions: ["league.validate_levels"], component: Levels },
  { route: "league", label: "league", actions: ["league.manage"], component: League },
  { route: "money", label: "money", actions: ["payments.view", "vouchers.manage"], component: Money },
  { route: "cash", label: "cash", actions: ["payments.view", "cash.manage"], component: Cash },
  { route: "cafe", label: "cafe", actions: ["cafe.orders", "cafe.manage"], component: Cafe },
];

export function allowed(modules: Module[], can: (action: string) => boolean): Module[] {
  return modules.filter((m) => m.actions.some(can));
}
