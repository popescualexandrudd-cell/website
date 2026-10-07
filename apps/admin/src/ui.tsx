/** Small pieces every module uses: loading data with a reload, and an action that asks for a
 * reason first (every change by staff is recorded with its reason, R-013 / audit). */
import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { unwrap } from "./api";
import { usePanel, useT } from "./panel";

export function useData<T>(load: () => Promise<T>, deps: unknown[]): { data: T | null; reload: () => Promise<void> } {
  const { fail } = usePanel();
  const [data, setData] = useState<T | null>(null);
  // Only the latest request may answer: an older, slower one (the day before, the filter before)
  // never replaces newer data on the screen.
  const latest = useRef(0);
  const reload = useCallback(async () => {
    const request = ++latest.current;
    try {
      const value = await load();
      if (request === latest.current) setData(value);
    } catch (error) {
      if (request === latest.current) fail(error);
    }
  }, deps);
  useEffect(() => {
    setData(null); // new filters: nothing of the old answer stays shown under them
    void reload();
  }, [reload]);
  return { data, reload };
}

/** A button that opens a small form asking for the reason, then runs the action. */
export function ReasonAction({
  label,
  onConfirm,
  danger = false,
  children,
}: {
  label: string;
  onConfirm: (reason: string) => Promise<void>;
  danger?: boolean;
  children?: ReactNode;
}) {
  const t = useT();
  const { fail } = usePanel();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      setOpen(false);
      setReason("");
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };
  if (!open) {
    return (
      <button type="button" className={danger ? "button button--danger" : "button"} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <form className="inline-form" onSubmit={(e) => void submit(e)} aria-label={label}>
      {children}
      <label>
        {t("reason")}
        <input required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <button type="submit" className={danger ? "button button--danger" : "button button--primary"} disabled={busy}>
        {label}
      </button>
      <button type="button" className="button button--quiet" onClick={() => setOpen(false)}>
        {t("cancel")}
      </button>
    </form>
  );
}

export type Picked = { id: string; name: string };

/** Finds a customer by name, email or phone and picks one (bookings, subscriptions, companies). */
export function UserPicker({ label, value, onPick }: { label: string; value: Picked | null; onPick: (user: Picked | null) => void }) {
  const t = useT();
  const { api, fail } = usePanel();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Picked[]>([]);
  const search = async () => {
    try {
      const page = await unwrap(api.client.GET("/api/v1/staff/users", { params: { query: { q: query.trim(), limit: 8, offset: 0 } } }));
      setFound(page.items.filter((u) => u.is_active).map((u) => ({ id: u.id, name: `${u.last_name} ${u.first_name}${u.email ? ` · ${u.email}` : ""}` })));
    } catch (error) {
      fail(error);
    }
  };
  if (value) {
    return (
      <p className="picked">
        {label}: <strong>{value.name}</strong>{" "}
        <button type="button" className="link" onClick={() => onPick(null)}>
          {t("picker.change")}
        </button>
      </p>
    );
  }
  return (
    <div className="picker">
      <label>
        {label}
        <input
          value={query}
          placeholder={t("picker.hint")}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
      </label>
      <button type="button" className="button" onClick={() => void search()}>
        {t("picker.find")}
      </button>
      {found.length ? (
        <ul className="picker__list" aria-label={t("picker.results")}>
          {found.map((u) => (
            <li key={u.id}>
              <button type="button" className="link" onClick={() => onPick(u)}>
                {u.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Lei typed by staff ("60", "60,50", "60.5") → bani (ADR-0009: integers only); null if not a sum. */
export function toBani(lei: string): number | null {
  const clean = lei.trim().replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, part = ""] = clean.split(".") as [string, string?];
  return Number(whole) * 100 + Number(part.padEnd(2, "0"));
}

/** Bani → the lei a person types back ("6050" → "60,50"). */
export function toLei(bani: number): string {
  return bani % 100 === 0 ? String(bani / 100) : `${Math.floor(bani / 100)},${String(bani % 100).padStart(2, "0")}`;
}
