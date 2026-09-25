/**
 * Field definitions for the generic content editor. Plain data only, so the same
 * definitions drive the server-side parser and the client-side form.
 */

export type Option = { value: string; label: string };

type Base = {
  name: string;
  label: string;
  help?: string;
  /** The form refuses to save without a value (Romanian, for translatable fields). */
  required?: boolean;
  /** Nullable column: an empty input stores NULL. */
  nullable?: boolean;
  /** Fieldset legend; consecutive fields with the same group share a fieldset. */
  group?: string;
  readOnly?: boolean;
};

export type FieldDef = Base &
  (
    | { kind: "text"; maxLength?: number; inputType?: "text" | "email" | "url" | "tel" | "color" }
    | { kind: "textarea"; rows?: number; maxLength?: number }
    | { kind: "slug" }
    | { kind: "i18n"; maxLength?: number }
    | { kind: "i18nText"; rows?: number }
    | { kind: "i18nMarkdown"; rows?: number }
    | { kind: "i18nList" }
    | { kind: "i18nItems" }
    | { kind: "i18nRecord"; keys: Option[] }
    | { kind: "int"; min?: number; max?: number }
    /** Whole numbers written as "60, 90, 120" (an Int[] column). */
    | { kind: "intList"; min?: number; max?: number }
    | { kind: "float"; min?: number; max?: number; step?: number }
    | { kind: "decimal" }
    | { kind: "bool" }
    | { kind: "triBool" }
    | { kind: "enum"; options: Option[] }
    | { kind: "relation"; source: RelationSource }
    /** An uploaded photo (default), video, or either (the gallery). */
    | { kind: "media"; accept?: MediaAccept }
    | { kind: "date" }
    | { kind: "datetime" }
    | { kind: "time" }
    | { kind: "weekday" }
    | { kind: "hours" }
  );

export type RelationSource =
  | "program"
  | "lessonType"
  | "location"
  | "coach"
  | "academyGroup"
  | "amateurPlayer"
  | "leagueSeason";
export type MediaAccept = "image" | "video" | "any";

export type I18nValue = { ro: string; en: string };
export type MediaValue = { id: string; url: string; alt: string } | null;
export type HoursRow = { label: I18nValue; hours: I18nValue };

/** Form values as serialised for the client. */
export type FieldValue =
  string | boolean | I18nValue | Record<string, I18nValue> | MediaValue | HoursRow[];

export const WEEKDAYS: Option[] = [
  { value: "1", label: "Luni" },
  { value: "2", label: "Marți" },
  { value: "3", label: "Miercuri" },
  { value: "4", label: "Joi" },
  { value: "5", label: "Vineri" },
  { value: "6", label: "Sâmbătă" },
  { value: "7", label: "Duminică" },
];

export const AUDIENCES: Option[] = [
  { value: "COPII", label: "Copii" },
  { value: "JUNIORI", label: "Juniori" },
  { value: "ADULTI", label: "Adulți" },
  { value: "TOATE", label: "Toate vârstele" },
];

export const LEVELS: Option[] = [
  { value: "INCEPATOR", label: "Începător" },
  { value: "INTERMEDIAR", label: "Intermediar" },
  { value: "AVANSAT", label: "Avansat" },
  { value: "COMPETITIE", label: "Competiție" },
  { value: "TOATE", label: "Toate nivelurile" },
];

export const PRICE_UNITS: Option[] = [
  { value: "LECTIE", label: "pe lecție (tot grupul)" },
  { value: "PERSOANA", label: "de persoană" },
  { value: "LUNA", label: "pe lună" },
  { value: "PACHET", label: "pe pachet" },
  { value: "EVENIMENT", label: "pe eveniment" },
];

export const SURFACES: Option[] = [
  { value: "ZGURA", label: "Zgură" },
  { value: "HARD", label: "Hard" },
  { value: "IARBA", label: "Iarbă" },
  { value: "SINTETIC", label: "Sintetic" },
  { value: "COVOR", label: "Covor" },
];

export const FACILITY_TYPES: Option[] = [
  { value: "DOTARE_BAZA", label: "Dotare a bazei" },
  { value: "SERVICIU_ANTRENOR", label: "Serviciu oferit de antrenor" },
  { value: "ECHIPAMENT", label: "Echipament" },
];

export const FAQ_CATEGORIES: Option[] = [
  { value: "INCEPUT", label: "Început" },
  { value: "ECHIPAMENT", label: "Echipament" },
  { value: "COPII", label: "Copii" },
  { value: "PROGRAM_PLATA", label: "Program și plată" },
  { value: "TEREN_VREME", label: "Teren și vreme" },
  { value: "COMPETITIE", label: "Competiție" },
];

export const GALLERY_CATEGORIES: Option[] = [
  { value: "LECTII", label: "Lecții" },
  { value: "GRUPE", label: "Grupe" },
  { value: "TURNEE", label: "Turnee" },
  { value: "TERENURI", label: "Terenuri" },
  { value: "EVENIMENTE", label: "Evenimente" },
];

export const BALL_STAGES: Option[] = [
  { value: "ROSU", label: "Minge roșie (teren mic)" },
  { value: "PORTOCALIU", label: "Minge portocalie (trei sferturi de teren)" },
  { value: "VERDE", label: "Minge verde (teren întreg)" },
  { value: "GALBEN", label: "Minge galbenă (standard)" },
];

export const RESULT_LEVELS: Option[] = [
  { value: "REGIONAL", label: "Regional" },
  { value: "NATIONAL", label: "Național" },
  { value: "INTERNATIONAL", label: "Internațional" },
];

export const POST_STATUSES: Option[] = [
  { value: "CIORNA", label: "Ciornă (nu apare pe site)" },
  { value: "PUBLICAT", label: "Publicat" },
];

export const BOOKING_MODES: Option[] = [
  { value: "CERERE", label: "Cerere: confirm eu fiecare rezervare" },
  { value: "INSTANT", label: "Instant: rezervarea e confirmată imediat" },
];

export const TIMEZONES: Option[] = [
  { value: "Europe/Bucharest", label: "Europe/Bucharest (România)" },
  { value: "Europe/Chisinau", label: "Europe/Chisinau (Republica Moldova)" },
];

export function optionLabel(options: Option[], value: string | null | undefined): string {
  return options.find((o) => o.value === value)?.label ?? value ?? "";
}
