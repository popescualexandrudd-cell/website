"use client";

/** Loads the page again (the offline page: once the connection is back, the page asked for opens). */
export function ReloadButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
      {label}
    </button>
  );
}
