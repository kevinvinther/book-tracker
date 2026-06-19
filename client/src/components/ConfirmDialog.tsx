import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(24rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-sm border border-rule bg-card p-6 shadow-xl">
          <Dialog.Title className="font-display text-lg text-foreground">{title}</Dialog.Title>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
            <Button variant="destructive" onClick={onConfirm} disabled={loading}>
              {loading ? "Deleting…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
