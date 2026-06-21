import { useState } from "react";
import { cn } from "@/lib/utils";

interface CoverImageProps {
  src: string;
  alt: string;
  variant?: "card" | "detail" | "mini";
  className?: string;
}

export function CoverImage({ src, alt, variant = "card", className }: CoverImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    const aspectClass =
      variant === "mini" ? "aspect-[5/7]" : "aspect-[2/3]";
    const sizeClass = variant === "mini" ? "h-16 w-10" : "w-full";
    const label = variant === "mini" ? "—" : "No cover";

    return (
      <div
        className={cn(
          `flex ${sizeClass} items-center justify-center bg-muted`,
          variant !== "mini" && "rounded-sm border border-rule",
          aspectClass,
          className,
        )}
      >
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("block h-auto w-full", className)}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}