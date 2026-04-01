'use client';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmTone?: 'danger' | 'neutral';
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmTone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close confirmation dialog"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_28%),rgba(2,6,23,0.88)] backdrop-blur-md"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative z-[101] w-full max-w-md overflow-hidden rounded-[1.6rem] border border-sky-500/20 bg-slate-950/95 shadow-[0_24px_90px_rgba(2,6,23,0.5)]"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.1),transparent_32%),radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_28%)] pointer-events-none" />

        <div className="relative px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-4">
            <div
              className={[
                'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border',
                confirmTone === 'danger'
                  ? 'border-sky-500/30 bg-sky-500/12 text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.14)]'
                  : 'border-sky-500/30 bg-sky-500/12 text-sky-200 shadow-[0_0_24px_rgba(56,189,248,0.14)]',
              ].join(' ')}
              aria-hidden="true"
            >
              <span className="text-lg font-semibold">
                {confirmTone === 'danger' ? '!' : '?'}
              </span>
            </div>

            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Confirm Action
              </p>
              <h2
                id="confirm-dialog-title"
                className="text-xl font-semibold leading-tight text-slate-50"
              >
                {title}
              </h2>
              <p className="text-sm leading-6 text-slate-300/95">{description}</p>
            </div>
          </div>

          <div className="mt-5 h-px bg-gradient-to-r from-transparent via-slate-700/80 to-transparent" />

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500/80 hover:bg-slate-800/90 sm:w-auto sm:min-w-[7rem]"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={[
                'w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition shadow-xl sm:w-auto sm:min-w-[8.5rem]',
                confirmTone === 'danger'
                  ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-500 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-sky-300/70'
                  : 'bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-sky-300/70',
              ].join(' ')}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
