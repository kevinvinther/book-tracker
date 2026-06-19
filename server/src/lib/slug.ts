import slug from "limax";

export function generateSlug(
  title: string,
  existingSlugs: Set<string> = new Set(),
  author?: string,
): string {
  if (!title || title.trim() === "") {
    return fallbackSlug();
  }

  let base = slug(title, { separator: "-", replacement: "-" });
  base = base.toLowerCase();
  base = base.replace(/[^a-z0-9-]/g, "-");
  base = base.replace(/-+/g, "-");
  base = base.replace(/^-|-$/g, "");
  base = base.slice(0, 80);

  if (base === "") {
    return fallbackSlug();
  }

  if (!existingSlugs.has(base)) {
    return base;
  }

  const authorSuffix = author ? slug(author.split(" ").pop() || author, { separator: "-", replacement: "-" }).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) : null;

  if (authorSuffix) {
    let candidate = `${base}-${authorSuffix}`.slice(0, 80);
    if (!existingSlugs.has(candidate)) {
      return candidate;
    }
    let counter = 2;
    while (true) {
      candidate = `${base}-${authorSuffix}-${counter}`.slice(0, 80);
      if (!existingSlugs.has(candidate)) {
        return candidate;
      }
      counter++;
    }
  }

  let counter = 2;
  while (true) {
    const candidate = `${base}-${counter}`.slice(0, 80);
    if (!existingSlugs.has(candidate)) {
      return candidate;
    }
    counter++;
  }
}

export function generateNoteSlug(existingSlugs: Set<string>): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const base = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  let slug = base;
  let counter = 2;
  while (existingSlugs.has(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

function fallbackSlug(): string {
  return `untitled-${Date.now()}`;
}
