"use client";

import Link from "next/link";
import "./globals.css";

/** Last-resort error page (the root layout itself failed), so it carries its own <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ro">
      <body>
        <main className="grid-page error-page">
          <div className="error-copy">
            <p className="error-code" aria-hidden="true">
              500
            </p>
            <h1 className="page-title">Ceva n-a mers.</h1>
            <p className="page-intro">
              A apărut o eroare de partea noastră. Încearcă din nou peste un minut. Dacă se repetă, revino mai târziu sau
              scrie-ne din pagina de contact.
            </p>
            <p className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" onClick={reset}>
                Încearcă din nou
              </button>
              <Link href="/" className="btn btn-secondary">
                Înapoi la prima pagină
              </Link>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
