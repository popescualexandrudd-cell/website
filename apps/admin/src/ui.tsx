/** Small pieces every module uses: loading data with a reload, and an action that asks for a
 * reason first (every change by staff is recorded with its reason, R-013 / audit). */
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { usePanel, useT } from "./panel";

export function useData<T>(load: () => Promise<T>, deps: unknown[]): { data: T | null; reload: () => Promise<void> } {
  const { fail } = usePanel();
  const [data, setData] = useState<T | null>(null);
  const reload = useCallback(async () => {
    try {
      setData(await load());
    } catch (error) {
      fail(error);
    }
  }, deps);
  useEffect(() => {
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
