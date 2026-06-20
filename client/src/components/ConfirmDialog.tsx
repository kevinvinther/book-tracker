import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";

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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={title} className="md:w-[min(24rem,90vw)]">
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
        <Button variant="destructive" onClick={onConfirm} disabled={loading}>
          {loading ? "Deleting…" : confirmLabel}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
