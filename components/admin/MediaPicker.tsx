"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { listMediaAction } from "@/app/actions/admin-media";
import type { MediaAccept } from "@/lib/admin/fields";
import type { MediaThumb } from "@/lib/admin/media";
import { MediaUploader } from "./MediaUploader";

type Props = {
  name: string;
  label: string;
  accept: MediaAccept;
  initial: MediaThumb | null;
  required?: boolean;
  describedBy?: string;
  invalid?: boolean;
};

const subscribeNoop = () => () => undefined;

const WORDS: Record<MediaAccept, { none: string; noun: string; the: string; upload: string }> = {
  image: {
    none: "Nicio imagine",
    noun: "imaginea",
    the: "Imaginea",
    upload: "Încarcă o fotografie nouă",
  },
  video: {
    none: "Niciun video",
    noun: "video-ul",
    the: "Video-ul",
    upload: "Încarcă un video nou",
  },
  any: {
    none: "Nimic ales",
    noun: "fotografia sau video-ul",
    the: "Fișierul",
    upload: "Încarcă o fotografie sau un video",
  },
};

/** The thumbnail of a library item: the photo, or a video's poster frame and its state. */
export function MediaThumbnail({ item, size }: { item: MediaThumb; size: number }) {
  const label =
    item.kind !== "VIDEO"
      ? null
      : item.status === "IN_PROCESARE"
        ? "Video · se convertește"
        : item.status === "EROARE"
          ? "Video · eroare"
          : `Video${item.durationSec ? ` · ${Math.round(item.durationSec)} s` : ""}`;
  return (
    <span className="media-thumb" style={{ width: size, height: size }}>
      {item.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an already optimised variant
        <img src={item.url} alt="" loading="lazy" width={size} height={size} />
      ) : (
        <span className="media-thumb-empty" aria-hidden="true" />
      )}
      {label ? <span className="media-thumb-badge">{label}</span> : null}
    </span>
  );
}

/** A media field: current thumbnail, a library dialog with upload, and "remove". */
export function MediaPicker({
  name,
  label,
  accept,
  initial,
  required,
  describedBy,
  invalid,
}: Props) {
  const words = WORDS[accept];
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
      const items = (await listMediaAction()).filter(
        (item) =>
          accept === "any" ||
          (accept === "video" ? item.kind === "VIDEO" : item.kind === "IMAGINE"),
      );
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
          <span className="grid gap-1">
            <MediaThumbnail item={selected} size={96} />
            <span className="sr-only">{selected.alt}</span>
          </span>
        ) : (
          <span className="text-note text-cerneala-2">
            {required ? `${words.none} ales.` : `${words.none} (se folosește grafica implicită).`}
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
            {selected ? `Schimbă ${words.noun}` : `Alege ${words.noun}`}
          </button>
          {selected && !required ? (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setSelected(null)}
            >
              Scoate {words.noun}
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
                <summary className="btn btn-secondary btn-small list-none">{words.upload}</summary>
                <div className="mt-3">
                  <MediaUploader compact accept={accept} onUploaded={(id) => void load(id)} />
                </div>
              </details>
              {loadError ? (
                <p role="alert" className="field-error">
                  Biblioteca nu s-a putut încărca. Închide fereastra și încearcă din nou.
                </p>
              ) : library === null ? (
                <p role="status">Se încarcă biblioteca…</p>
              ) : library.length === 0 ? (
                <p>
                  {accept === "video"
                    ? "Nu ai încărcat încă niciun video. Încarcă primul mai sus."
                    : "Biblioteca e goală. Încarcă primul fișier mai sus."}
                </p>
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
                        <MediaThumbnail item={item} size={144} />
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
