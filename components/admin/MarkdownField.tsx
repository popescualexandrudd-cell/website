"use client";

import { useState, useTransition } from "react";
import { previewMarkdownAction } from "@/app/actions/admin-content";

type Props = {
  name: string;
  lang: "ro" | "en";
  initial: string;
  rows: number;
  labelledBy: string;
  describedBy?: string;
  invalid?: boolean;
};

/** Markdown textarea with a preview rendered on the server exactly as on the site. */
export function MarkdownField({
  name,
  lang,
  initial,
  rows,
  labelledBy,
  describedBy,
  invalid,
}: Props) {
  const [value, setValue] = useState(initial);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [html, setHtml] = useState("");
  const [pending, startTransition] = useTransition();

  function showPreview() {
    setMode("preview");
    startTransition(async () => {
      setHtml(await previewMarkdownAction(value));
    });
  }

  return (
    <div>
      <div className="admin-tabs" role="group" aria-label={`Editor ${lang.toUpperCase()}`}>
        <button type="button" aria-pressed={mode === "write"} onClick={() => setMode("write")}>
          Scrie
        </button>
        <button type="button" aria-pressed={mode === "preview"} onClick={showPreview}>
          Previzualizare
        </button>
      </div>
      <textarea
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="input font-mono text-[0.9rem]"
        hidden={mode !== "write"}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid ? true : undefined}
        lang={lang}
        spellCheck
      />
      {mode === "preview" ? (
        pending ? (
          <p role="status" className="md-preview">
            Se pregătește previzualizarea…
          </p>
        ) : (
          <div
            className="md-preview prose-ed"
            lang={lang}
            dangerouslySetInnerHTML={{ __html: html || "<p><em>Textul e gol.</em></p>" }}
          />
        )
      ) : null}
    </div>
  );
}
