"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

type Props = { openLabel: string; closeLabel: string; children: ReactNode };

/**
 * Full-screen menu built on the native <dialog>: focus is trapped, Escape closes it and the
 * page behind becomes inert. Smooth scrolling is paused while it is open.
 */
export function MenuDialog({ openLabel, closeLabel, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    window.dispatchEvent(new CustomEvent("site:menu", { detail: { open } }));
  }, [open]);

  // Close after navigating to another page.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const toggle = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (dialog.open) {
      dialog.close();
    } else {
      dialog.showModal();
      setOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        onClick={toggle}
      >
        <span className="menu-button-lines" aria-hidden="true" />
        <span>{openLabel}</span>
      </button>
      <dialog ref={dialogRef} id={id} className="menu-dialog" aria-label={openLabel}>
        <div className="menu-dialog-inner">
          <button type="button" className="menu-close" onClick={() => dialogRef.current?.close()}>
            {closeLabel}
          </button>
          {children}
        </div>
      </dialog>
    </>
  );
}
