// Reusable modal form (shadcn Dialog). Keeps the buttons, the spinner and the
// error message in one place, so every "add something" form behaves the same.
// The error is shown INSIDE the dialog, so it is never hidden behind the overlay.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  submittingLabel?: string;
  cancelLabel?: string; // text of the "close without saving" button
  destructive?: boolean; // red submit button
  submitDisabled?: boolean;
  onSubmit: () => Promise<void>; // throw an Error to show its message in the dialog
  children: ReactNode; // the form fields
}

export default function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  submittingLabel = "Saving…",
  cancelLabel = "Cancel",
  destructive = false,
  submitDisabled = false,
  onSubmit,
  children,
}: FormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Start clean every time the dialog opens.
  useEffect(() => {
    if (open) {
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent {...(description ? {} : { "aria-describedby": undefined })}>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="grid gap-4">{children}</div>

          {error && (
            <p role="alert" className="flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2 sm:space-x-0">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              disabled={submitting || submitDisabled}
            >
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitting ? submittingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
