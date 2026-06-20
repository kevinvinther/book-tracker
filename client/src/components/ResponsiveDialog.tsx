import { useEffect, useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  className?: string;
  children: React.ReactNode;
}

export function ResponsiveDialog({ open, onOpenChange, title, className, children }: ResponsiveDialogProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && popupRef.current) {
      const focusable = popupRef.current.querySelector<HTMLElement>(
        "input, select, textarea, button",
      );
      if (focusable) focusable.focus();
    }
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Popup
          ref={popupRef}
          className={cn(
            "fixed z-50 border border-rule bg-card p-6 shadow-xl",
            "inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-lg",
            "md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:max-h-[85vh] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-sm",
            "motion-safe:animate-slide-up md:motion-safe:animate-none",
            className,
          )}
        >
          <Dialog.Title className="font-display text-xl text-foreground">{title}</Dialog.Title>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
