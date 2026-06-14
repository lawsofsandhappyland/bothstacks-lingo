interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-void/95 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="retro-card bg-deep-violet text-ghost-white flex flex-col gap-4"
      >
        <h2 className="text-flame-orange font-black text-xl">{title}</h2>
        <p className="text-ghost-white/90 text-sm">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="pill-button bg-void border-slate-grey text-ghost-white hover:bg-slate-grey/20"
          >
            {cancelLabel ?? 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="pill-button bg-red-600 border-red-950 text-ghost-white hover:bg-red-500"
          >
            {confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
