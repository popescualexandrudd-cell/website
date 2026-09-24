"use client";

import { useId, useRef, useState } from "react";

type Props = {
  /** Called with the new media id after a successful upload. */
  onUploaded: (id: string) => void;
  compact?: boolean;
};

/** Upload form: one photo, a mandatory description, optional warm grade to match the paintings. */
export function MediaUploader({ onUploaded, compact = false }: Props) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const form = event.currentTarget;
    setError(null);
    setDone(false);
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Alege o fotografie.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Fișierul depășește 10 MB. Micșorează fotografia și încearcă din nou.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: data });
      const body = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || !body.id) {
        setError(body.error ?? "Încărcarea nu a reușit. Verifică conexiunea și încearcă din nou.");
        return;
      }
      form.reset();
      setDone(true);
      onUploaded(body.id);
    } catch {
      setError("Încărcarea nu a reușit. Verifică conexiunea și încearcă din nou.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={upload}
      className={compact ? "grid gap-3" : "admin-panel grid gap-3"}
      noValidate
    >
      <label className="field">
        <span className="field-label">
          Fotografia (JPG, PNG, WebP, AVIF sau HEIC, maximum 10 MB)
        </span>
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
          required
          className="input"
        />
      </label>
      <div className="admin-grid-2">
        <label className="field">
          <span className="field-label">
            Ce se vede în fotografie <span className="admin-lang">RO</span>
          </span>
          <input
            type="text"
            name="altRo"
            required
            minLength={3}
            maxLength={300}
            className="input"
            aria-describedby={`${id}-alt`}
          />
        </label>
        <label className="field">
          <span className="field-label">
            Descrierea în engleză <span className="admin-lang">EN</span> (opțional)
          </span>
          <input type="text" name="altEn" maxLength={300} className="input" />
        </label>
      </div>
      <p id={`${id}-alt`} className="text-note text-cerneala-2">
        Descrierea (textul alternativ) e citită de cititoarele de ecran și de Google. De exemplu:
        „Elevă de 10 ani lovind un forehand pe zgură”.
      </p>
      <label className="admin-check">
        <input type="checkbox" name="treatment" />
        <span>
          Aplică tratamentul cald (culori calde și granulație fină), ca fotografiile să arate unitar
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
          {busy ? "Se încarcă…" : "Încarcă fotografia"}
        </button>
        {done ? (
          <span role="status" className="text-note text-succes">
            Fotografia e încărcată.
          </span>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
