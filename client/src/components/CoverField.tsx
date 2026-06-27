import { CoverImage } from "@/components/CoverImage";

interface CoverFieldProps {
  previewSrc: string | null;
  alt: string;
  uploading: boolean;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
}

export function CoverField({ previewSrc, alt, uploading, onFileSelected, onRemove }: CoverFieldProps) {
  return (
    <div>
      {previewSrc ? (
        <div className="relative mb-2 inline-block">
          <div className="h-40 overflow-hidden rounded-sm border border-rule">
            <CoverImage src={previewSrc} alt={alt} variant="detail" className="h-40 object-cover" />
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-1 right-1 rounded-full bg-background/80 px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Remove cover"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="flex aspect-[2/3] h-40 items-center justify-center rounded-sm border border-dashed border-rule bg-muted/50">
          <span className="text-xs text-muted-foreground">No cover</span>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelected(f);
        }}
        className="mt-1.5 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
      />
      {uploading && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
    </div>
  );
}
