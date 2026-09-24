import "server-only";
import { db } from "../db";
import { t } from "../i18n-content";
import { mediaIds, toFormValue } from "./form-values";
import { toThumb, type MediaThumb } from "./media";
import { visibleFields, type Resource, type Row } from "./resources";
import type { FieldValue, Option, RelationSource } from "./fields";

async function relationOptions(
  sources: Set<RelationSource>,
): Promise<Partial<Record<RelationSource, Option[]>>> {
  const out: Partial<Record<RelationSource, Option[]>> = {};
  const toOption = (row: { id: string; name: unknown; active: boolean }) => ({
    value: row.id,
    label: `${t(row.name, "ro")}${row.active ? "" : " (inactiv)"}`,
  });
  if (sources.has("program")) {
    const programs = await db.program.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true, active: true },
    });
    out.program = programs.map(toOption);
  }
  if (sources.has("lessonType")) {
    const lessons = await db.lessonType.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true, active: true },
    });
    out.lessonType = lessons.map(toOption);
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
  };
}

/** Sensible defaults for a new row (the database defaults, where the form needs to show them). */
function defaultFor(name: string, kind: string): unknown {
  if (kind === "bool") return ["active", "bookableOnline"].includes(name);
  if (kind === "intList" && name === "durations") return [60, 90, 120, 150, 180];
  if (name === "minParticipants" || name === "maxParticipants") return 1;
  if (name === "currency") return "RON";
  return null;
}
