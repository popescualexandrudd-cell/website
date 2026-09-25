"use client";

import { useId, useRef, useState } from "react";
import type { MediaAccept } from "@/lib/admin/fields";

type Props = {
  /** Called with the new media id after a successful upload. */
  onUploaded: (id: string) => void;
  compact?: boolean;
  /** What may be uploaded here; "any" shows a choice between a photo and a video. */
  accept?: MediaAccept;
};

const PHOTO_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 500 * 1024 * 1024;
const NETWORK_ERROR = "Încărcarea nu a reușit. Verifică conexiunea și încearcă din nou.";

type Kind = "image" | "video";

/**
 * Upload form: one photo or one video, with a mandatory description. Photos go up as a form;
 * videos as the raw file with a progress bar (they can be hundreds of MB), then the server
 * converts them in the background.
 */
export function MediaUploader({ onUploaded, compact = false, accept = "any" }: Props) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<Kind>(accept === "video" ? "video" : "image");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState<Kind | null>(null);

  function uploadVideo(file: File, altRo: string, altEn: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", "/api/admin/media/video");
      request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      request.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
      request.setRequestHeader("X-Alt-Ro", encodeURIComponent(altRo));
      if (altEn) request.setRequestHeader("X-Alt-En", encodeURIComponent(altEn));
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
      };
      request.onerror = () => reject(new Error(NETWORK_ERROR));
      request.onload = () => {
        let body: { id?: string; error?: string } = {};
        try {
          body = JSON.parse(request.responseText) as typeof body;
        } catch {
          // Not JSON: a proxy refused the request (e.g. the file is too large for it).
        }
        if (request.status >= 200 && request.status < 300 && body.id) resolve(body.id);
        else
          reject(
            new Error(
              body.error ??
                (request.status === 413
                  ? "Video-ul e prea mare pentru server. Folosește un clip mai scurt."
                  : NETWORK_ERROR),
            ),
          );
      };
      request.send(file);
    });
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const form = event.currentTarget;
    setError(null);
    setDone(null);
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError(kind === "video" ? "Alege un video." : "Alege o fotografie.");
      return;
    }
    const altRo = String(data.get("altRo") ?? "").trim();
    const altEn = String(data.get("altEn") ?? "").trim();
    if (altRo.length < 3) {
      setError("Descrie în câteva cuvinte ce se vede (textul alternativ e obligatoriu).");
      return;
    }
    if (kind === "image" && file.size > PHOTO_MAX) {
      setError("Fișierul depășește 10 MB. Micșorează fotografia și încearcă din nou.");
      return;
    }
    if (kind === "video" && file.size > VIDEO_MAX) {
      setError("Video-ul depășește 500 MB. Folosește un clip mai scurt sau exportă-l la 1080p.");
      return;
    }
    setBusy(true);
    try {
      let newId: string;
      if (kind === "video") {
        setProgress(0);
        newId = await uploadVideo(file, altRo, altEn);
      } else {
        const response = await fetch("/api/admin/media", { method: "POST", body: data });
        const body = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
        if (!response.ok || !body.id) throw new Error(body.error ?? NETWORK_ERROR);
        newId = body.id;
      }
      form.reset();
      setDone(kind);
      onUploaded(newId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : NETWORK_ERROR);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={upload}
      className={compact ? "grid gap-3" : "admin-panel grid gap-3"}
      noValidate
    >
      {accept === "any" ? (
        <fieldset className="flex flex-wrap gap-4">
          <legend className="field-label">Ce încarci</legend>
          {(
            [
              ["image", "O fotografie"],
              ["video", "Un video"],
            ] as const
          ).map(([value, text]) => (
            <label key={value} className="admin-check">
              <input
                type="radio"
                name={`${id}-kind`}
                checked={kind === value}
                onChange={() => {
                  setKind(value);
                  setError(null);
                  formRef.current?.reset();
                }}
              />
              <span>{text}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      <label className="field">
        <span className="field-label">
          {kind === "video"
            ? "Video-ul (MP4, MOV, WebM, maximum 500 MB și 3 minute)"
            : "Fotografia (JPG, PNG, WebP, AVIF sau HEIC, maximum 10 MB)"}
        </span>
        <input
          key={kind}
          type="file"
          name="file"
          accept={
            kind === "video"
              ? "video/mp4,video/quicktime,video/webm,video/x-matroska,video/*"
              : "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
          }
          required
          className="input"
        />
      </label>
      <div className="admin-grid-2">
        <label className="field">
          <span className="field-label">
            Ce se vede {kind === "video" ? "în video" : "în fotografie"}{" "}
            <span className="admin-lang">RO</span>
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
        {kind === "video"
          ? "Descrierea e citită de cititoarele de ecran și de Google. De exemplu: „Grupa de juniori la exerciții de deplasare pe zgură”. Pentru deschiderea paginii principale, un clip orizontal de 10–20 de secunde arată cel mai bine; sunetul nu se aude acolo."
          : "Descrierea (textul alternativ) e citită de cititoarele de ecran și de Google. De exemplu: „Elevă de 10 ani lovind un forehand pe zgură”."}
      </p>
      {kind === "image" ? (
        <label className="admin-check">
          <input type="checkbox" name="treatment" />
          <span>
            Aplică tratamentul cald (culori calde și granulație fină), ca fotografiile să arate
            unitar
          </span>
        </label>
      ) : null}
      {progress !== null ? (
        <div className="grid gap-1">
          <progress max={100} value={progress} className="w-full" aria-label="Încărcarea video">
            {progress}%
          </progress>
          <span className="text-note text-cerneala-2" aria-live="polite">
            Se încarcă: {progress}%. Nu închide pagina până la final.
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
          {busy ? "Se încarcă…" : kind === "video" ? "Încarcă video-ul" : "Încarcă fotografia"}
        </button>
        {done ? (
          <span role="status" className="text-note text-succes">
            {done === "video"
              ? "Video-ul e încărcat. Serverul îl convertește acum pentru web; durează de obicei 1–3 minute."
              : "Fotografia e încărcată."}
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
