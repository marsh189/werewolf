import type { NotebookView } from '@/models/game';

type NotebookModalProps = {
  notebook: NotebookView;
  onClose: () => void;
};

export default function NotebookModal({ notebook, onClose }: NotebookModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-6">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-slate-100 font-semibold">
            {notebook.name}&apos;s Notebook
          </h2>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800"
            aria-label="Close notebook"
            onClick={onClose}
          >
            X
          </button>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-200 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
          {notebook.content.trim() || 'No notes were found.'}
        </div>
      </div>
    </div>
  );
}
