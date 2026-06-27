export function toDatePart(isoString: string): string {
  return isoString.slice(0, 10);
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Coerce an arbitrary date-ish string into a `YYYY-MM-DD` value for date inputs. */
export function toDateInputValue(raw: string | undefined): string {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const year = raw.match(/^\d{4}$/);
  if (year) return `${year[0]}-01-01`;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}
