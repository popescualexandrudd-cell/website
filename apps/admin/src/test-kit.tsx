/** What the panel's unit tests share: a fake API answering by "METHOD /path", the calls made,
 * and the panel context with the chosen actions (Vitest + Testing Library, jsdom). */
import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { adminApi } from "./api";
import { type Panel, PanelContext } from "./panel";

export type Call = { method: string; path: string; query: string; body: unknown };

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export function fakeApi(answers: Record<string, (body: unknown, url: URL) => Response>) {
  const calls: Call[] = [];
  const fetchStub = async (request: Request) => {
    const url = new URL(request.url);
    const body = request.method === "GET" ? null : await request.clone().json().catch(() => null);
    calls.push({ method: request.method, path: url.pathname, query: url.search, body });
    const answer = answers[`${request.method} ${url.pathname}`];
    return answer ? answer(body, url) : json({ error: { code: "common.not_found", params: {} } }, 404);
  };
  return { calls, fetchStub: fetchStub as unknown as typeof fetch };
}

export function mountPanel(ui: ReactNode, fetchStub: typeof fetch, actions: string[], path: string[] = []): Panel {
  const panel: Panel = {
    api: adminApi(fetchStub, () => "csrftoken=T"),
    lang: "ro",
    permissions: {
      user: { id: "me", first_name: "Eu", last_name: "Admin", email: null },
      roles: ["manager"],
      scopes: [{ location_id: "l1", location_name: "Jungle Padel", location_slug: "jungle", actions }],
    },
    locationId: "l1",
    can: (a) => actions.includes(a),
    notify: vi.fn(),
    fail: vi.fn(),
    go: vi.fn(),
    path,
  };
  render(<PanelContext.Provider value={panel}>{ui}</PanelContext.Provider>);
  return panel;
}

export const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
