export function toDatePart(isoString: string): string {
  return isoString.slice(0, 10);
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
