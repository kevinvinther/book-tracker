/** Upload a local image file into attachments/, returning its stored filename. */
export async function uploadAttachment(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.filename as string;
}

/** Download a remote image URL into attachments/, returning its stored filename. */
export async function downloadAttachment(url: string): Promise<string> {
  const res = await fetch("/api/attachments/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error("Failed to download image");
  const data = await res.json();
  return data.filename as string;
}
