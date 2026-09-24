"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { listMediaAction } from "@/app/actions/admin-media";
import type { MediaThumb } from "@/lib/admin/media";
import { MediaUploader } from "./MediaUploader";

type Props = {
  name: string;
  label: string;
  initial: MediaThumb | null;
  required?: boolean;
  describedBy?: string;
  invalid?: boolean;
};

const subscribeNoop = () => () => undefined;

/** A media field: current thumbnail, a library dialog with upload, and "remove". */
export function MediaPicker({ name, label, initial, required, describedBy, invalid }: Props) {
  const [selected, setSelected] = useState<MediaThumb | null>(initial);
  const [library, setLibrary] = useState<MediaThumb[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  async function load(selectId?: string) {
    setLoadError(false);
    try {
      const items = await listMediaAction();
      setLibrary(items);
      if (selectId) {
        const found = items.find((m) => m.id === selectId);
        if (found) {
          setSelected(found);
          dialogRef.current?.close();
        }
      }
    } catch {
      setLoadError(true);
    }
  }

  function open() {
    dialogRef.current?.showModal();
    if (!library) void load();
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <div className="flex flex-wrap items-center gap-3">
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an already optimised variant
          <img
            src={selected.url}
            alt={selected.alt}
            width={96}
            height={96}
            className="h-24 w-24 object-cover"
          />
        ) : (
          <span className="text-note text-cerneala-2">
            {required ? "Nicio imagine aleasă." : "Nicio imagine (se folosește grafica implicită)."}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={open}
            aria-describedby={describedBy}
            data-invalid={invalid ? "true" : undefined}
          >
            {selected ? "Schimbă imaginea" : "Alege imaginea"}
          </button>
          {selected && !required ? (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setSelected(null)}
            >
              Scoate imaginea
            </button>
          ) : null}
        </div>
      </div>

      {mounted
        ? createPortal(
            <dialog ref={dialogRef} className="media-picker-dialog" aria-label={`Alege: ${label}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="admin-h2 mb-0">{label}</h2>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => dialogRef.current?.close()}
                >
                  Închide
                </button>
              </div>
              <details className="mb-4">
                <summary className="btn btn-secondary btn-small list-none">
                  Încarcă o fotografie nouă
                </summary>
                <div className="mt-3">
                  <MediaUploader compact onUploaded={(id) => void load(id)} />
                </div>
              </details>
              {loadError ? (
                <p role="alert" className="field-error">
                  Biblioteca nu s-a putut încărca. Închide fereastra și încearcă din nou.
                </p>
              ) : library === null ? (
                <p role="status">Se încarcă biblioteca…</p>
              ) : library.length === 0 ? (
                <p>Biblioteca e goală. Încarcă prima fotografie mai sus.</p>
              ) : (
                <ul className="media-grid">
                  {library.map((item) => (
                    <li key={item.id} className="media-tile">
                      <button
                        type="button"
                        aria-pressed={selected?.id === item.id}
                        onClick={() => {
                          setSelected(item);
                          dialogRef.current?.close();
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                        <img src={item.url} alt="" loading="lazy" width={144} height={144} />
                        <span className="sr-only">Alege: </span>
                        <span className="line-clamp-2 text-left">{item.alt}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </dialog>,
            document.body,
          )
        : null}
    </div>
  );
}
