"use client";

import { useId, useState } from "react";
import { deleteContentAction, saveContentAction } from "@/app/actions/admin-content";
import { useFormAction } from "@/components/ui/useFormAction";
import {
  WEEKDAYS,
  type FieldDef,
  type FieldValue,
  type HoursRow,
  type I18nValue,
  type Option,
  type RelationSource,
} from "@/lib/admin/fields";
import type { MediaThumb } from "@/lib/admin/media";
import { MarkdownField } from "./MarkdownField";
import { MediaPicker } from "./MediaPicker";

type Props = {
  resourceKey: string;
  id: string | null;
  singular: string;
  addLabel: string;
  fields: FieldDef[];
  values: Record<string, FieldValue>;
  media: Record<string, MediaThumb | null>;
  relations: Partial<Record<RelationSource, Option[]>>;
  canDelete: boolean;
  previewHref: string | null;
};

type Group = { legend: string; fields: FieldDef[] };

function groupFields(fields: FieldDef[]): Group[] {
  const groups: Group[] = [];
  for (const field of fields) {
    const legend = field.group ?? "";
    const last = groups.at(-1);
    if (last && last.legend === legend) last.fields.push(field);
    else groups.push({ legend, fields: [field] });
  }
  return groups;
}

const asI18n = (v: FieldValue | undefined): I18nValue =>
  v && typeof v === "object" && !Array.isArray(v) && "ro" in v && typeof v.ro === "string"
    ? (v as I18nValue)
    : { ro: "", en: "" };
const asString = (v: FieldValue | undefined): string => (typeof v === "string" ? v : "");

export function ResourceForm(props: Props) {
  const {
    resourceKey,
    id,
    singular,
    addLabel,
    fields,
    values,
    media,
    relations,
    canDelete,
    previewHref,
  } = props;
  const { state, pending, formProps } = useFormAction(saveContentAction);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <>
      <form {...formProps} className="admin-form" noValidate>
        <input type="hidden" name="_resource" value={resourceKey} />
        <input type="hidden" name="_id" value={id ?? ""} />
        <p className="text-note text-cerneala-2">
          Câmpurile marcate cu <span aria-hidden="true">*</span>
          <span className="sr-only">steluță</span> sunt obligatorii. Textul în engleză e opțional:
          dacă lipsește, pagina în engleză arată textul în română.
        </p>
        {state.status === "error" && state.error ? (
          <p role="alert" className="admin-warning">
            {state.error}
          </p>
        ) : null}
        {groupFields(fields).map((group) => (
          <fieldset key={group.legend || "general"}>
            {group.legend ? <legend>{group.legend}</legend> : null}
            {group.fields.map((field) => (
              <FieldControl
                key={field.name}
                field={field}
                value={values[field.name]}
                media={media[field.name] ?? null}
                options={field.kind === "relation" ? (relations[field.source] ?? []) : []}
                error={errors[field.name]}
              />
            ))}
          </fieldset>
        ))}
        <div className="admin-sticky-actions items-center">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Se salvează…" : id ? "Salvează modificările" : addLabel}
          </button>
          {previewHref && id ? (
            <a
              href={`/api/preview/enable?redirect=${encodeURIComponent(previewHref)}`}
              target="_blank"
              rel="noopener"
              className="btn btn-secondary"
            >
              Previzualizează
            </a>
          ) : null}
          {state.status === "success" ? (
            <span role="status" className="text-succes">
              Modificările sunt salvate.
            </span>
          ) : null}
        </div>
      </form>
      {canDelete && id ? (
        <DeleteForm resourceKey={resourceKey} id={id} singular={singular} />
      ) : null}
    </>
  );
}

function DeleteForm({
  resourceKey,
  id,
  singular,
}: {
  resourceKey: string;
  id: string;
  singular: string;
}) {
  const { state, pending, formProps } = useFormAction(deleteContentAction);
  const [confirming, setConfirming] = useState(false);
  return (
    <section className="admin-section border-t border-linie pt-6" aria-label="Ștergere">
      {state.status === "error" ? (
        <p role="alert" className="admin-warning mb-3">
          {state.error}
        </p>
      ) : null}
      {confirming ? (
        <form {...formProps} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="_resource" value={resourceKey} />
          <input type="hidden" name="_id" value={id} />
          <span>Ștergerea nu se poate anula.</span>
          <button type="submit" className="btn btn-danger btn-small" disabled={pending}>
            Da, șterge {singular}
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
          className="btn btn-secondary btn-small"
          onClick={() => setConfirming(true)}
        >
          Șterge {singular}
        </button>
      )}
    </section>
  );
}

type ControlProps = {
  field: FieldDef;
  value: FieldValue | undefined;
  media: MediaThumb | null;
  options: Option[];
  error?: string;
};

function FieldControl({ field, value, media, options, error }: ControlProps) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const labelId = `${uid}-label`;
  const helpId = field.help ? `${uid}-help` : undefined;
  const errorId = error ? `${uid}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const name = `f.${field.name}`;
  const invalid = error ? true : undefined;
  const label = (
    <>
      {field.label}
      {field.required ? <span aria-hidden="true"> *</span> : null}
    </>
  );
  const foot = (
    <>
      {field.help ? (
        <span id={helpId} className="field-hint">
          {field.help}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="field-error">
          {error}
        </span>
      ) : null}
    </>
  );
  const common = {
    "aria-describedby": describedBy,
    "aria-invalid": invalid,
    disabled: field.readOnly,
  };

  switch (field.kind) {
    case "bool":
      return (
        <div className="grid gap-1">
          <label className="admin-check">
            <input type="checkbox" name={name} defaultChecked={value === true} {...common} />
            <span>{field.label}</span>
          </label>
          {foot}
        </div>
      );

    case "i18n":
    case "i18nText":
    case "i18nList":
    case "i18nItems":
    case "i18nMarkdown": {
      const v = asI18n(value);
      const multiline = field.kind !== "i18n";
      const rows =
        field.kind === "i18nText" || field.kind === "i18nMarkdown" ? (field.rows ?? 4) : 5;
      return (
        <div className="field" role="group" aria-labelledby={labelId}>
          <span id={labelId} className="field-label">
            {label}
          </span>
          <div className="admin-grid-2">
            {(["ro", "en"] as const).map((lang) =>
              field.kind === "i18nMarkdown" ? (
                <div key={lang} className="grid gap-1">
                  <span id={`${labelId}-${lang}`} className="admin-lang w-fit">
                    {lang.toUpperCase()}
                  </span>
                  <MarkdownField
                    name={`${name}.${lang}`}
                    lang={lang}
                    initial={v[lang]}
                    rows={rows}
                    labelledBy={`${labelId} ${labelId}-${lang}`}
                    describedBy={describedBy}
                    invalid={invalid && lang === "ro"}
                  />
                </div>
              ) : (
                <label key={lang} className="grid gap-1">
                  <span className="admin-lang w-fit" aria-hidden="true">
                    {lang.toUpperCase()}
                  </span>
                  <span className="sr-only">
                    {field.label} – {lang === "ro" ? "română" : "engleză"}
                  </span>
                  {multiline ? (
                    <textarea
                      name={`${name}.${lang}`}
                      rows={rows}
                      defaultValue={v[lang]}
                      className="input"
                      lang={lang}
                      {...common}
                      aria-invalid={invalid && lang === "ro" ? true : undefined}
                    />
                  ) : (
                    <input
                      type="text"
                      name={`${name}.${lang}`}
                      defaultValue={v[lang]}
                      maxLength={field.maxLength}
                      className="input"
                      lang={lang}
                      {...common}
                      aria-invalid={invalid && lang === "ro" ? true : undefined}
                    />
                  )}
                </label>
              ),
            )}
          </div>
          {field.kind === "i18nMarkdown" ? (
            <span className="field-hint">
              Formatare: **aldin**, *cursiv*, „## Titlu” pe un rând nou, „- ” pentru listă,
              [text](https://adresă) pentru link.
            </span>
          ) : null}
          {(field.kind === "i18nItems" || field.kind === "i18nList") && !field.help ? (
            <span className="field-hint">Câte un element pe rând.</span>
          ) : null}
          {foot}
        </div>
      );
    }

    case "i18nRecord": {
      const record =
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, I18nValue>)
          : {};
      return (
        <div className="field" role="group" aria-labelledby={labelId}>
          <span id={labelId} className="field-label">
            {label}
          </span>
          {field.keys.map((k) => (
            <div key={k.value} className="admin-grid-2">
              {(["ro", "en"] as const).map((lang) => (
                <label key={lang} className="field">
                  <span className="text-note">
                    {k.label} <span className="admin-lang">{lang.toUpperCase()}</span>
                  </span>
                  <input
                    type="text"
                    name={`${name}.${k.value}.${lang}`}
                    defaultValue={record[k.value]?.[lang] ?? ""}
                    className="input"
                    lang={lang}
                    {...common}
                  />
                </label>
              ))}
            </div>
          ))}
          {foot}
        </div>
      );
    }

    case "hours":
      return (
        <HoursControl
          name={name}
          label={label}
          labelId={labelId}
          rows={Array.isArray(value) ? (value as HoursRow[]) : []}
          foot={foot}
        />
      );

    case "media":
      return (
        <div className="field" role="group" aria-labelledby={labelId}>
          <span id={labelId} className="field-label">
            {label}
          </span>
          <MediaPicker
            name={name}
            label={field.label}
            initial={media}
            required={field.required}
            describedBy={describedBy}
            invalid={invalid}
          />
          {foot}
        </div>
      );

    case "enum":
    case "relation":
    case "weekday":
    case "triBool": {
      const list: Option[] =
        field.kind === "enum"
          ? field.options
          : field.kind === "weekday"
            ? WEEKDAYS
            : field.kind === "triBool"
              ? [
                  { value: "da", label: "Da" },
                  { value: "nu", label: "Nu" },
                ]
              : options;
      const allowEmpty = field.kind === "triBool" || (field.kind === "relation" && !field.required);
      const emptyLabel =
        field.kind === "triBool"
          ? "Nu știu încă ([DE COMPLETAT])"
          : field.kind === "relation"
            ? "— niciunul —"
            : "";
      return (
        <div className="field">
          <label htmlFor={inputId} className="field-label">
            {label}
          </label>
          <select
            id={inputId}
            name={name}
            defaultValue={asString(value)}
            className="input"
            {...common}
          >
            {allowEmpty || !asString(value) ? (
              <option value="">{emptyLabel || "Alege…"}</option>
            ) : null}
            {list.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {foot}
        </div>
      );
    }

    default: {
      const type =
        field.kind === "int" || field.kind === "float"
          ? "number"
          : field.kind === "decimal"
            ? "text"
            : field.kind === "date"
              ? "date"
              : field.kind === "datetime"
                ? "datetime-local"
                : field.kind === "time"
                  ? "time"
                  : field.kind === "text"
                    ? (field.inputType ?? "text")
                    : "text";
      const numberProps =
        field.kind === "int"
          ? { min: field.min, max: field.max, step: 1, inputMode: "numeric" as const }
          : field.kind === "intList"
            ? { inputMode: "numeric" as const, pattern: "[0-9 ,;]*" }
            : field.kind === "float"
              ? { min: field.min, max: field.max, step: field.step ?? "any" }
              : field.kind === "decimal"
                ? { inputMode: "decimal" as const }
                : {};
      return (
        <div className="field">
          <label htmlFor={inputId} className="field-label">
            {label}
          </label>
          {field.kind === "textarea" ? (
            <textarea
              id={inputId}
              name={name}
              rows={field.rows ?? 4}
              defaultValue={asString(value)}
              className="input"
              {...common}
            />
          ) : (
            <input
              id={inputId}
              type={type}
              name={name}
              defaultValue={asString(value)}
              className="input"
              maxLength={field.kind === "text" ? field.maxLength : undefined}
              autoCapitalize={field.kind === "slug" ? "none" : undefined}
              {...numberProps}
              {...common}
            />
          )}
          {foot}
        </div>
      );
    }
  }
}

function HoursControl(props: {
  name: string;
  label: React.ReactNode;
  labelId: string;
  rows: HoursRow[];
  foot: React.ReactNode;
}) {
  const empty: HoursRow = { label: { ro: "", en: "" }, hours: { ro: "", en: "" } };
  const rows = [...props.rows, empty, empty].slice(
    0,
    Math.max(3, Math.min(7, props.rows.length + 2)),
  );
  return (
    <div className="field" role="group" aria-labelledby={props.labelId}>
      <span id={props.labelId} className="field-label">
        {props.label}
      </span>
      <div className="grid gap-3">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 border-b border-linie pb-3 sm:grid-cols-4">
            {(
              [
                ["label", "ro", "Zilele", "Luni–vineri"],
                ["label", "en", "Zilele (EN)", "Monday–Friday"],
                ["hours", "ro", "Orele", "08:00–21:00"],
                ["hours", "en", "Orele (EN)", "08:00–21:00"],
              ] as const
            ).map(([part, lang, text, placeholder]) => (
              <label key={`${part}-${lang}`} className="grid gap-1 text-note">
                <span>{text}</span>
                <input
                  type="text"
                  name={`${props.name}.${i}.${part}.${lang}`}
                  defaultValue={row[part][lang]}
                  placeholder={placeholder}
                  className="input"
                  lang={lang}
                />
              </label>
            ))}
          </div>
        ))}
      </div>
      <span className="field-hint">
        Un rând gol nu apare pe site. „închis” se afișează ca atare.
      </span>
      {props.foot}
    </div>
  );
}
