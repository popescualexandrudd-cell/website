"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
};

export function MediaLibrary({ items }: { items: LibraryItem[] }) {
  const router = useRouter();
  return (
    <>
      <section className="admin-section">
        <h2 className="admin-h2">Încarcă o fotografie</h2>
        <MediaUploader onUploaded={() => router.refresh()} />
      </section>
      <section className="admin-section">
        <h2 className="admin-h2">Biblioteca ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-cerneala-2">
            Nu ai încărcat încă nicio fotografie. Până atunci, site-ul folosește grafica implicită
            (terenul desenat în linii) și rama de pe pagina principală rămâne goală.
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
  return (
    <div className="media-card">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an optimised variant */}
      <img src={item.url} alt={item.altRo} loading="lazy" width={320} height={240} />
      <p className="text-note text-cerneala-2">
        {item.width} × {item.height} px · {item.size} · {item.uploaded}
        <br />
        {item.usage > 0
          ? `Folosită în ${item.usage} ${item.usage === 1 ? "loc" : "locuri"}`
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
            Da, șterge fotografia
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
          Șterge fotografia
        </button>
      )}
    </div>
  );
}
