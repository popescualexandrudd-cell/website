/** Notifications in the panel (§11): the texts edited and reset, the latest messages sent. */
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { type Call, fakeApi, json, mountPanel, settle } from "../test-kit";
import { MODULES, allowed } from "./index";
import { Notifications } from "./Notifications";

let calls: Call[];

function mount(answers: Record<string, (body: unknown, url: URL) => Response>) {
  const api = fakeApi(answers);
  calls = api.calls;
  return mountPanel(<Notifications />, api.fetchStub, ["notifications.manage"]);
}

const last = (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path).at(-1);

const row = (event: string, channel: string, extra: Record<string, unknown> = {}) => ({
  event,
  category: "bookings",
  channel,
  language: "ro",
  subject: `Subiect ${event}`,
  body: "Bună, {{ first_name }}!",
  edited: false,
  ...extra,
});

afterEach(() => cleanup());

describe("notifications (§11)", () => {
  it("opens with notifications.manage only", () => {
    expect(allowed(MODULES, (a) => a === "notifications.manage").map((m) => m.route)).toEqual(["notifications"]);
  });

  it("edit a text, go back to the default, and see the latest messages", async () => {
    const panel = mount({
      "GET /api/v1/staff/notifications/templates": () =>
        json([row("booking.confirmed", "email"), row("booking.reminder_2h", "push", { edited: true, subject: "Peste două ore" })]),
      "GET /api/v1/staff/notifications/outbox": () =>
        json([
          { id: "n1", event: "booking.confirmed", channel: "email", user_name: "Ana Pop", status: "sent", attempts: 1, last_error: "", created_at: "2027-03-16T08:00:00Z", sent_at: "2027-03-16T08:00:01Z" },
          { id: "n2", event: "booking.reminder_2h", channel: "push", user_name: "Ion Ene", status: "skipped", attempts: 1, last_error: "push is off", created_at: "2027-03-16T08:05:00Z", sent_at: null },
        ]),
      "PUT /api/v1/staff/notifications/templates": () => json({ ok: true }),
      "POST /api/v1/staff/notifications/templates/reset": () => json({ ok: true }),
    });
    await settle();
    expect(last("GET", "/api/v1/staff/notifications/templates")?.query).toBe("?location_id=l1");
    expect(screen.getByText("Peste două ore").parentElement?.textContent).toContain("modificat");
    expect(screen.getByText("Ion Ene").closest("tr")?.textContent).toContain("Nu s-a trimis (oprit sau fără canal) · push is off");

    // search
    fireEvent.change(screen.getByLabelText("Caută"), { target: { value: "reminder" } });
    expect(screen.queryByText("Subiect booking.confirmed")).toBeNull();
    fireEvent.change(screen.getByLabelText("Caută"), { target: { value: "" } });

    // edit the email text
    const email = screen.getByText("Subiect booking.confirmed").closest("tr") as HTMLElement;
    await act(async () => fireEvent.click(within(email).getByRole("button", { name: "Modifică" })));
    const form = screen.getByRole("form", { name: "Textul pentru booking.confirmed" });
    fireEvent.change(within(form).getByLabelText("Subiectul"), { target: { value: "Te așteptăm" } });
    fireEvent.change(within(form).getByLabelText("Textul"), { target: { value: "Salut {{ first_name }}" } });
    expect(within(form).queryByRole("button", { name: "Revino la textul implicit" })).toBeNull();
    await act(async () => {
      fireEvent.submit(form);
    });
    await settle();
    expect(last("PUT", "/api/v1/staff/notifications/templates")?.body).toEqual({
      location_id: "l1",
      event: "booking.confirmed",
      channel: "email",
      language: "ro",
      subject: "Te așteptăm",
      body: "Salut {{ first_name }}",
    });
    expect(panel.notify).toHaveBeenCalledWith("Textul e salvat.");

    // reset the edited push text
    const push = screen.getByText("Peste două ore").closest("tr") as HTMLElement;
    await act(async () => fireEvent.click(within(push).getByRole("button", { name: "Modifică" })));
    const pushForm = screen.getByRole("form", { name: "Textul pentru booking.reminder_2h" });
    expect(within(pushForm).getByLabelText("Titlul")).toBeTruthy();
    await act(async () => fireEvent.click(within(pushForm).getByRole("button", { name: "Revino la textul implicit" })));
    await settle();
    expect(last("POST", "/api/v1/staff/notifications/templates/reset")?.body).toEqual({
      location_id: "l1",
      event: "booking.reminder_2h",
      channel: "push",
      language: "ro",
    });
    expect(panel.notify).toHaveBeenCalledWith("S-a revenit la textul implicit.");
  });

  it("a refused text says why; an empty outbox says so; closing the form", async () => {
    const panel = mount({
      "GET /api/v1/staff/notifications/templates": () => json([row("booking.confirmed", "email")]),
      "GET /api/v1/staff/notifications/outbox": () => json([]),
      "PUT /api/v1/staff/notifications/templates": () => json({ error: { code: "notifications.template_invalid", params: {} } }, 422),
    });
    await settle();
    expect(screen.getByText("Nu s-a trimis încă niciun mesaj.")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Modifică" })));
    const form = screen.getByRole("form", { name: "Textul pentru booking.confirmed" });
    await act(async () => {
      fireEvent.submit(form);
    });
    await settle();
    expect(panel.fail).toHaveBeenCalled();
    await act(async () => fireEvent.click(within(form).getByRole("button", { name: "Renunț" })));
    expect(screen.queryByRole("form")).toBeNull();
  });
});
