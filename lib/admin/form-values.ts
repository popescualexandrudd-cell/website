import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { Prisma } from "../generated/prisma/client";
import { zonedInstant } from "../availability";
import { TODO_MARK } from "../i18n-content";
import type { FieldDef, FieldValue, HoursRow, I18nValue } from "./fields";
import type { Row } from "./resources";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DECIMAL = /^\d{1,8}([.,]\d{1,2})?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function i18n(value: unknown): I18nValue {
  if (typeof value === "string") return { ro: value, en: "" };
  if (!isRecord(value)) return { ro: "", en: "" };
  return {
    ro: typeof value.ro === "string" ? value.ro : "",
    en: typeof value.en === "string" ? value.en : "",
  };
}

function lines(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

// ─── Row → form values ───────────────────────────────────────────────────────

export function toFormValue(field: FieldDef, value: unknown, tz: string): FieldValue {
  switch (field.kind) {
    case "i18n":
    case "i18nText":
    case "i18nMarkdown":
      return i18n(value);
    case "i18nList": {
      const record = isRecord(value) ? value : {};
      return { ro: lines(record.ro).join("\n"), en: lines(record.en).join("\n") };
    }
    case "i18nItems": {
      const items = Array.isArray(value) ? value.map(i18n) : [];
      return { ro: items.map((i) => i.ro).join("\n"), en: items.map((i) => i.en).join("\n") };
    }
    case "i18nRecord": {
      const record = isRecord(value) ? value : {};
      return Object.fromEntries(field.keys.map((k) => [k.value, i18n(record[k.value])]));
    }
    case "hours":
      return Array.isArray(value)
        ? value
            .filter(isRecord)
            .map((row): HoursRow => ({ label: i18n(row.label), hours: i18n(row.hours) }))
        : [];
    case "bool":
      return value === true;
    case "triBool":
      return value === true ? "da" : value === false ? "nu" : "";
    case "intList":
      return Array.isArray(value) ? value.join(", ") : "";
    case "date":
      return value instanceof Date ? value.toISOString().slice(0, 10) : "";
    case "datetime":
      return value instanceof Date ? formatInTimeZone(value, tz, "yyyy-MM-dd'T'HH:mm") : "";
    case "media":
      // Resolved separately (the page loads all referenced media in one query).
      return null;
    default:
      return value === null || value === undefined ? "" : String(value);
  }
}

// ─── Form data → database values ─────────────────────────────────────────────

export type ParseResult = { data: Record<string, unknown>; errors: Record<string, string> };

const REQUIRED = "Completează acest câmp.";

function read(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function translatable(roText: string, enText: string): { ro: string; en?: string } {
  return enText ? { ro: roText, en: enText } : { ro: roText };
}

function parseNumber(text: string): number | null {
  if (text === "") return null;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) ? value : Number.NaN;
}

/**
 * Parses and validates the submitted form against the field definitions. Only fields in
 * `fields` are read, so a crafted request cannot write any other column.
 */
export function parseForm(fields: FieldDef[], form: FormData, tz: string): ParseResult {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const fail = (name: string, message: string) => {
    errors[name] = message;
  };

  for (const field of fields) {
    if (field.readOnly) continue;
    const key = `f.${field.name}`;
    const { name } = field;

    switch (field.kind) {
      case "text":
      case "textarea": {
        const value = read(form, key);
        const max = field.maxLength ?? (field.kind === "text" ? 300 : 8000);
        if (value.length > max) fail(name, `Textul e prea lung (maximum ${max} de caractere).`);
        else if (!value && field.required) fail(name, REQUIRED);
        // The seed's placeholder may stay until the real value is known; everything else is checked.
        else if (value.includes(TODO_MARK)) data[name] = value;
        else if (
          value &&
          field.kind === "text" &&
          field.inputType === "email" &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          fail(name, "Adresa de email nu pare corectă.");
        } else if (
          value &&
          field.kind === "text" &&
          field.inputType === "url" &&
          !/^https:\/\/\S+$/.test(value)
        ) {
          fail(name, "Scrie adresa completă, care începe cu https://");
        } else data[name] = value || (field.nullable ? null : "");
        break;
      }
      case "slug": {
        const value = read(form, key).toLowerCase();
        if (!value) fail(name, REQUIRED);
        else if (!SLUG.test(value) || value.length > 80)
          fail(
            name,
            "Folosește doar litere mici fără diacritice, cifre și cratime (de exemplu lectii-copii).",
          );
        else data[name] = value;
        break;
      }
      case "i18n":
      case "i18nText":
      case "i18nMarkdown": {
        const roText = read(form, `${key}.ro`);
        const enText = read(form, `${key}.en`);
        const max = field.kind === "i18n" ? (field.maxLength ?? 300) : 60_000;
        if (roText.length > max || enText.length > max)
          fail(name, `Textul e prea lung (maximum ${max} de caractere).`);
        else if (!roText && field.required) fail(name, "Completează textul în română.");
        else if (!roText && !enText && field.nullable) data[name] = Prisma.DbNull;
        else data[name] = translatable(roText, enText);
        break;
      }
      case "i18nList": {
        data[name] = {
          ro: splitLines(read(form, `${key}.ro`)),
          en: splitLines(read(form, `${key}.en`)),
        };
        break;
      }
      case "i18nItems": {
        const roLines = splitLines(read(form, `${key}.ro`));
        const enLines = splitLines(read(form, `${key}.en`));
        data[name] = roLines.map((line, i) => translatable(line, enLines[i] ?? ""));
        break;
      }
      case "i18nRecord": {
        const record: Record<string, { ro: string; en?: string }> = {};
        for (const k of field.keys) {
          const roText = read(form, `${key}.${k.value}.ro`);
          const enText = read(form, `${key}.${k.value}.en`);
          if (roText || enText) record[k.value] = translatable(roText, enText);
        }
        data[name] = Object.keys(record).length > 0 ? record : field.nullable ? Prisma.DbNull : {};
        break;
      }
      case "hours": {
        const rows: HoursRow[] = [];
        for (let i = 0; i < 7; i += 1) {
          const label = {
            ro: read(form, `${key}.${i}.label.ro`),
            en: read(form, `${key}.${i}.label.en`),
          };
          const hours = {
            ro: read(form, `${key}.${i}.hours.ro`),
            en: read(form, `${key}.${i}.hours.en`),
          };
          if (label.ro && hours.ro) rows.push({ label, hours });
          else if (label.ro || hours.ro)
            fail(name, `Rândul ${i + 1}: completează și zilele, și orele (sau lasă ambele goale).`);
        }
        data[name] = rows.map((r) => ({
          label: translatable(r.label.ro, r.label.en),
          hours: translatable(r.hours.ro, r.hours.en),
        }));
        break;
      }
      case "int":
      case "float":
      case "weekday": {
        const value = parseNumber(read(form, key));
        const min = field.kind === "weekday" ? 1 : field.min;
        const max = field.kind === "weekday" ? 7 : field.max;
        if (value === null) {
          if (field.nullable) data[name] = null;
          else fail(name, REQUIRED);
        } else if (
          Number.isNaN(value) ||
          ((field.kind === "int" || field.kind === "weekday") && !Number.isInteger(value))
        ) {
          fail(
            name,
            field.kind === "float" ? "Scrie un număr, de exemplu 0,5." : "Scrie un număr întreg.",
          );
        } else if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
          fail(name, `Valoarea trebuie să fie între ${min ?? "…"} și ${max ?? "…"}.`);
        } else data[name] = value;
        break;
      }
      case "intList": {
        const parts = read(form, key)
          .split(/[\s,;]+/)
          .filter(Boolean);
        const values = parts.map((part) => Number(part));
        if (values.length === 0) {
          if (field.nullable) data[name] = [];
          else fail(name, REQUIRED);
        } else if (values.some((v) => !Number.isInteger(v))) {
          fail(name, "Scrie numere întregi despărțite prin virgulă, de exemplu 60, 90, 120.");
        } else if (
          values.some(
            (v) =>
              (field.min !== undefined && v < field.min) ||
              (field.max !== undefined && v > field.max),
          )
        ) {
          fail(
            name,
            `Fiecare valoare trebuie să fie între ${field.min ?? "…"} și ${field.max ?? "…"}.`,
          );
        } else data[name] = [...new Set(values)].sort((a, b) => a - b);
        break;
      }
      case "decimal": {
        const value = read(form, key).replace(/\s/g, "");
        if (!value) {
          if (field.nullable) data[name] = null;
          else fail(name, REQUIRED);
        } else if (!DECIMAL.test(value))
          fail(name, "Scrie prețul doar cu cifre, de exemplu 250 sau 250,50.");
        else data[name] = value.replace(",", ".");
        break;
      }
      case "bool":
        data[name] = form.get(key) === "on";
        break;
      case "triBool": {
        const value = read(form, key);
        data[name] = value === "da" ? true : value === "nu" ? false : null;
        break;
      }
      case "enum": {
        const value = read(form, key);
        if (!field.options.some((o) => o.value === value)) fail(name, "Alege o opțiune din listă.");
        else data[name] = value;
        break;
      }
      case "relation":
      case "media": {
        const value = read(form, key);
        if (!value) {
          if (field.required)
            fail(
              name,
              field.kind !== "media"
                ? "Alege o opțiune din listă."
                : field.accept === "video"
                  ? "Alege un video."
                  : field.accept === "any"
                    ? "Alege o fotografie sau un video."
                    : "Alege o imagine.",
            );
          else data[name] = null;
        } else if (!/^[a-z0-9]{8,40}$/i.test(value)) fail(name, "Valoare necunoscută.");
        else data[name] = value;
        break;
      }
      case "date": {
        const value = read(form, key);
        if (!value) {
          if (field.nullable) data[name] = null;
          else fail(name, REQUIRED);
        } else if (!DATE.test(value)) fail(name, "Alege o dată din calendar.");
        else data[name] = new Date(`${value}T00:00:00Z`);
        break;
      }
      case "datetime": {
        const value = read(form, key);
        const [date, time] = value.split("T");
        if (!value) {
          if (field.nullable) data[name] = null;
          else fail(name, REQUIRED);
        } else if (!date || !time || !DATE.test(date) || !TIME.test(time.slice(0, 5)))
          fail(name, "Alege data și ora.");
        else data[name] = zonedInstant(date, time.slice(0, 5), tz);
        break;
      }
      case "time": {
        const value = read(form, key);
        if (!value) {
          if (field.nullable) data[name] = null;
          else fail(name, REQUIRED);
        } else if (!TIME.test(value)) fail(name, "Scrie ora în forma 17:30.");
        else data[name] = value;
        break;
      }
    }
  }
  return { data, errors };
}

/** The media ids a row references, to load their thumbnails in one query. */
export function mediaIds(fields: FieldDef[], row: Row | null): string[] {
  if (!row) return [];
  return fields
    .filter((f) => f.kind === "media")
    .flatMap((f) => (typeof row[f.name] === "string" ? [row[f.name] as string] : []));
}
