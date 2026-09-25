"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteMediaAction, updateMediaAltAction } from "@/app/actions/admin-media";
import { useFormAction } from "@/components/ui/useFormAction";
import { MediaUploader } from "./MediaUploader";

export type LibraryItem = {
  id: string;
  url: string;
  altRo: string;
  altEn: string;
  width: number;
  height: number;
  size: string;
  uploaded: string;
  usage: number;
  kind: "IMAGINE" | "VIDEO";
  status: "GATA" | "IN_PROCESARE" | "EROARE";
  error: string | null;
  /** For a converted video: the smallest encoding, for the preview player. */
  videoSrc: string | null;
  durationSec: number | null;
};

export function MediaLibrary({ items }: { items: LibraryItem[] }) {
  const router = useRouter();
  const converting = items.some((item) => item.status === "IN_PROCESARE");
  // While a video is being converted, the page checks back every few seconds.
  useEffect(() => {
    if (!converting) return;
    const timer = window.setInterval(() => router.refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [converting, router]);
  return (
    <>
      <section className="admin-section">
        <h2 className="admin-h2">Încarcă o fotografie sau un video</h2>
        <MediaUploader onUploaded={() => router.refresh()} />
      </section>
      <section className="admin-section">
        <h2 className="admin-h2">Biblioteca ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-cerneala-2">
            Nu ai încărcat încă nicio fotografie sau video. Până atunci, site-ul folosește grafica
            implicită (terenul desenat în linii) și ramele rămân goale.
          </p>
        ) : (
          <ul className="media-library">
            {items.map((item) => (
              <li key={item.id}>
                <MediaCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function MediaCard({ item }: { item: LibraryItem }) {
  const save = useFormAction(updateMediaAltAction);
  const remove = useFormAction(deleteMediaAction);
  const [confirming, setConfirming] = useState(false);
  const video = item.kind === "VIDEO";
  const noun = video ? "video-ul" : "fotografia";
  return (
    <div className="media-card">
      {video && item.videoSrc ? (
        <video
          src={item.videoSrc}
          poster={item.url || undefined}
          controls
          preload="none"
          playsInline
          aria-label={item.altRo}
        />
      ) : item.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an optimised variant
        <img src={item.url} alt={item.altRo} loading="lazy" width={320} height={240} />
      ) : null}
      {video && item.status === "IN_PROCESARE" ? (
        <p role="status" className="admin-warning mb-0">
          Video-ul se convertește pentru web. Pagina se actualizează singură când e gata.
        </p>
      ) : null}
      {video && item.status === "EROARE" ? (
        <p role="alert" className="field-error">
          {item.error ?? "Conversia video nu a reușit."}
        </p>
      ) : null}
      <p className="text-note text-cerneala-2">
        {video ? `Video${item.durationSec ? ` · ${Math.round(item.durationSec)} s` : ""} · ` : ""}
        {item.width > 0 ? `${item.width} × ${item.height} px · ` : ""}
        {item.size} · {item.uploaded}
        <br />
        {item.usage > 0
          ? `${video ? "Folosit" : "Folosită"} în ${item.usage} ${item.usage === 1 ? "loc" : "locuri"}`
          : video
            ? "Nefolosit"
            : "Nefolosită"}
      </p>
      <form {...save.formProps} className="grid gap-2">
        <input type="hidden" name="id" value={item.id} />
        <label className="field">
          <span className="text-note font-medium">
            Descriere <span className="admin-lang">RO</span>
          </span>
          <input
            type="text"
            name="altRo"
            defaultValue={item.altRo}
            required
            minLength={3}
            maxLength={300}
            className="input"
          />
        </label>
        <label className="field">
          <span className="text-note font-medium">
            Descriere <span className="admin-lang">EN</span>
          </span>
          <input
            type="text"
            name="altEn"
            defaultValue={item.altEn}
            maxLength={300}
            className="input"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-secondary btn-small" disabled={save.pending}>
            Salvează descrierea
          </button>
          {save.state.status === "success" ? (
            <span role="status" className="text-note text-succes">
              Descrierea e salvată.
            </span>
          ) : null}
        </div>
        {save.state.status === "error" ? (
          <p role="alert" className="field-error">
            {save.state.fieldErrors?.altRo ?? save.state.error}
          </p>
        ) : null}
      </form>
      {remove.state.status === "error" ? (
        <p role="alert" className="field-error">
          {remove.state.error}
        </p>
      ) : null}
      {confirming ? (
        <form {...remove.formProps} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" className="btn btn-danger btn-small" disabled={remove.pending}>
            Da, șterge {noun}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => setConfirming(false)}
          >
            Renunț
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="btn btn-secondary btn-small w-fit"
          onClick={() => setConfirming(true)}
        >
          Șterge {noun}
        </button>
      )}
    </div>
  );
}
