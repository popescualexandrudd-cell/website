"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { GalleryView } from "@/lib/content";
import { Picture } from "@/components/ui/Picture";

type Props = { items: GalleryView[]; categories: string[] };

/**
 * Filterable photo grid with a lightbox on the native <dialog>: focus stays inside, Escape
 * closes, arrow keys move between photos, and focus returns to the photo that opened it.
 */
export function GalleryBrowser({ items, categories }: Props) {
  const t = useTranslations("gallery");
  const [filter, setFilter] = useState<string | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const visible = filter ? items.filter((i) => i.category === filter) : items;
  const current = index !== null ? visible[index] : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  const close = () => {
    setIndex(null);
    openerRef.current?.focus();
  };
  const move = (delta: number) =>
    setIndex((i) => (i === null ? null : (i + delta + visible.length) % visible.length));

  return (
    <>
      {categories.length > 1 ? (
        <div className="gallery-filters" role="group" aria-label={t("filterLabel")}>
          <button
            type="button"
            className="chip"
            aria-pressed={filter === null}
            onClick={() => setFilter(null)}
          >
            {t("all")}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className="chip"
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
            >
              {t(`categories.${category}`)}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="gallery-grid">
        {visible.map((item, i) => (
          <li key={item.id} className="gallery-item">
            <button
              type="button"
              onClick={(event) => {
                openerRef.current = event.currentTarget;
                setIndex(i);
              }}
            >
              <Picture image={item.image} alt={item.alt} sizes="(min-width: 1024px) 30vw, 50vw" />
            </button>
            {item.caption ? <p className="mt-2 text-note text-cerneala-2">{item.caption}</p> : null}
          </li>
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label={current?.alt ?? t("close")}
        onClose={() => setIndex(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") move(1);
          if (event.key === "ArrowLeft") move(-1);
        }}
      >
        {current ? (
          <div className="lightbox-inner">
            <div className="lightbox-bar">
              <p aria-live="polite">
                {t("counter", { current: (index ?? 0) + 1, total: visible.length })}
              </p>
              <button type="button" onClick={close}>
                {t("close")}
              </button>
            </div>
            <figure>
              <Picture image={current.image} alt={current.alt} sizes="90vw" priority />
              {current.caption ? <figcaption>{current.caption}</figcaption> : null}
            </figure>
            {visible.length > 1 ? (
              <div className="lightbox-nav">
                <button type="button" onClick={() => move(-1)}>
                  {t("previous")}
                </button>
                <button type="button" onClick={() => move(1)}>
                  {t("next")}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </>
  );
}
