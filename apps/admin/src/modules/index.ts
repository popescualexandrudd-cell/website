/** The panel's modules (§8.6) and the action each needs; the menu shows only what the staff
 * member may use at the chosen location. */
import type { ComponentType } from "react";
import { AI } from "./AI";
import { AIDrafts } from "./AIDrafts";
import { Attendance } from "./Attendance";
import { Blog } from "./Blog";
import { Audit } from "./Audit";
import { Cafe } from "./Cafe";
import { Calendar } from "./Calendar";
import { Cash } from "./Cash";
import { Classes } from "./Classes";
import { Corporate } from "./Corporate";
import { Devices } from "./Devices";
import { Events } from "./Events";
import { Dashboard } from "./Dashboard";
import { League } from "./League";
import { Levels } from "./Levels";
import { Money } from "./Money";
import { Notifications } from "./Notifications";
import { Pricing } from "./Pricing";
import { Reports } from "./Reports";
import { Resources } from "./Resources";
import { Settings } from "./Settings";
import { Signals } from "./Signals";
import { Subscriptions } from "./Subscriptions";
import { Staff, SystemStatus, upcoming } from "./System";
import { Users } from "./Users";

export type Module = {
  route: string;
  /** Text key under `admin.nav.*`. */
  label: string;
  /** Any one of these actions opens the module. */
  actions: string[];
  component: ComponentType;
  /** A module that comes with a later stage (shown, marked, not yet working). */
  stage?: number;
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
  { route: "events", label: "events", actions: ["events.manage"], component: Events },
  { route: "blog", label: "blog", actions: ["blog.manage"], component: Blog },
  { route: "notifications", label: "notifications", actions: ["notifications.manage"], component: Notifications },
  { route: "reports", label: "reports", actions: ["reports.view", "waitlist.view"], component: Reports },
  { route: "signals", label: "signals", actions: ["reports.view"], component: Signals },
  { route: "staff", label: "staff", actions: ["users.view"], component: Staff },
  { route: "devices", label: "devices", actions: ["devices.manage"], component: Devices },
  { route: "settings", label: "settings", actions: ["config.view", "flags.manage"], component: Settings },
  { route: "audit", label: "audit", actions: ["audit.view"], component: Audit },
  { route: "system", label: "system", actions: ["config.view"], component: SystemStatus },
  { route: "ai", label: "ai", actions: ["ai.view"], component: AI },
  { route: "community", label: "community", actions: ["ai.drafts"], component: AIDrafts },
  // Later stages (§8.6): shown and marked, so the owner sees the whole panel.
  { route: "content", label: "content", actions: ["config.manage"], component: upcoming("content", 11), stage: 11 },
  { route: "translations", label: "translations", actions: ["config.manage"], component: upcoming("translations", 11), stage: 11 },
];

export function allowed(modules: Module[], can: (action: string) => boolean): Module[] {
  return modules.filter((m) => m.actions.some(can));
}
