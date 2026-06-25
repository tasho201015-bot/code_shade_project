import { useI18n, type Lang } from "@/lib/i18n";

/**
 * Returns the localized value for `field` on `row`. In Arabic mode, prefers
 * `<field>_ar` and falls back to the English `<field>` when missing/empty.
 *
 * Works for any row shape; just pass the English field name and the helper
 * derives the Arabic sibling by suffixing `_ar`.
 *
 *   loc(product, "name", "ar")        -> product.name_ar || product.name || ""
 *   loc(size, "label", "ar")          -> size.label_ar  || size.label  || ""
 */
export function loc<T extends Record<string, any>>(
  row: T | null | undefined,
  field: keyof T & string,
  lang: Lang,
): string {
  if (!row) return "";
  if (lang === "ar") {
    const ar = row[`${field}_ar` as keyof T];
    if (ar !== null && ar !== undefined && String(ar).trim() !== "") {
      return String(ar);
    }
  }
  const en = row[field];
  return en === null || en === undefined ? "" : String(en);
}

/**
 * Localize a value stored inside a JSON object (e.g. sb_settings.data) using
 * the same `<key>` / `<key>_ar` sibling convention.
 */
export function locJson(
  obj: Record<string, any> | null | undefined,
  key: string,
  lang: Lang,
  fallback = "",
): string {
  if (!obj) return fallback;
  if (lang === "ar") {
    const ar = obj[`${key}_ar`];
    if (ar !== null && ar !== undefined && String(ar).trim() !== "") {
      return String(ar);
    }
  }
  const en = obj[key];
  return en === null || en === undefined || String(en).trim() === ""
    ? fallback
    : String(en);
}

/**
 * Hook variant: binds the active language from `useI18n()` so callers don't
 * have to thread `lang` through every call.
 *
 *   const tl = useLoc();
 *   <h2>{tl(product, "name")}</h2>
 */
export function useLoc() {
  const { lang } = useI18n();
  return <T extends Record<string, any>>(
    row: T | null | undefined,
    field: keyof T & string,
  ) => loc(row, field, lang);
}

/**
 * Hook variant for JSON-stored values.
 *
 *   const tj = useLocJson();
 *   <h3>{tj(settings.data, "offersTitle", "Special Offers")}</h3>
 */
export function useLocJson() {
  const { lang } = useI18n();
  return (
    obj: Record<string, any> | null | undefined,
    key: string,
    fallback = "",
  ) => locJson(obj, key, lang, fallback);
}
