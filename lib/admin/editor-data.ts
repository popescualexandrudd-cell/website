import "server-only";
import { artEntries } from "../art";
import { db } from "../db";
import { t } from "../i18n-content";
import { mediaIds, toFormValue } from "./form-values";
import { toThumb, type MediaThumb } from "./media";
import { visibleFields, type Resource, type Row } from "./resources";
import type { FieldValue, Option, RelationSource } from "./fields";

type ArtOption = Option & { url: string };

/** Paintings and program illustrations from the image set, with a small preview. */
function artOptions(): ArtOption[] {
  return artEntries(["scene", "program"]).map((a) => ({
    value: a.key,
    label: a.key.replace(/-/g, " "),
    url: a.preview,
  }));
}

async function relationOptions(
  sources: Set<RelationSource>,
): Promise<Partial<Record<RelationSource, Option[]>>> {
  const out: Partial<Record<RelationSource, Option[]>> = {};
  if (sources.has("program") || sources.has("groupProgram")) {
    const programs = await db.program.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true, format: true, active: true },
    });
    const toOption = (p: (typeof programs)[number]) => ({
      value: p.id,
      label: `${t(p.name, "ro")}${p.active ? "" : " (inactiv)"}`,
    });
    out.program = programs.map(toOption);
    out.groupProgram = programs.filter((p) => p.format === "GRUPA").map(toOption);
  }
  if (sources.has("location")) {
    const locations = await db.location.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    });
    out.location = locations.map((l) => ({ value: l.id, label: l.name }));
  }
  return out;
}

export async function loadEditorProps(resource: Resource, row: Row | null) {
  const settings = await db.siteSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { timezone: true },
  });
  const fields = visibleFields(resource, row);
  const values: Record<string, FieldValue> = {};
  for (const field of fields)
    values[field.name] = toFormValue(
      field,
      row ? row[field.name] : defaultFor(field.name, field.kind),
      settings.timezone,
    );

  const ids = mediaIds(fields, row);
  const mediaRows = ids.length > 0 ? await db.media.findMany({ where: { id: { in: ids } } }) : [];
  const media: Record<string, MediaThumb | null> = {};
  for (const field of fields) {
    if (field.kind !== "media") continue;
    const found = mediaRows.find((m) => row && m.id === row[field.name]);
    media[field.name] = found ? toThumb(found) : null;
  }

  const sources = new Set(fields.flatMap((f) => (f.kind === "relation" ? [f.source] : [])));
  return {
    fields,
    values,
    media,
    relations: await relationOptions(sources),
    art: fields.some((f) => f.kind === "art") ? artOptions() : [],
  };
}

/** Sensible defaults for a new row (the database defaults, where the form needs to show them). */
function defaultFor(name: string, kind: string): unknown {
  if (kind === "bool") return ["active", "bookableOnline"].includes(name);
  if (name === "currency") return "RON";
  return null;
}
