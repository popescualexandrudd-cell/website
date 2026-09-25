"use client";

/** Opens the browser's print dialog (the page's print styles hide everything but the card). */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn-primary" onClick={() => window.print()}>
      {label}
    </button>
  );
}
