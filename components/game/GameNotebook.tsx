'use client';

import { useEffect, useMemo, useState } from 'react';

type GameNotebookProps = {
  lobbyName?: string;
  userId?: string;
  canWrite?: boolean;
  onNotesChange?: (notes: string) => void;
};

export default function GameNotebook({
  lobbyName,
  userId,
  canWrite = true,
  onNotesChange,
}: GameNotebookProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  const storageKey = useMemo(() => {
    if (!lobbyName || !userId) return null;
    return `werewolf:notebook:${lobbyName}:${userId}`;
  }, [lobbyName, userId]);

  useEffect(() => {
    if (!storageKey) return;
    let initialNotes = '';
    try {
      const existing = window.localStorage.getItem(storageKey);
      initialNotes = existing ?? '';
    } catch {
      initialNotes = '';
    }
    const id = setTimeout(() => {
      setNotes(initialNotes);
    }, 0);
    return () => clearTimeout(id);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, notes);
    } catch {
      // Ignore persistence failures (private mode / storage restrictions)
    }
  }, [storageKey, notes]);

  useEffect(() => {
    if (!onNotesChange) return;
    onNotesChange(notes);
  }, [notes, onNotesChange]);

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(92vw,24rem)]">
      {isOpen ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="game-section-title">Notebook</h2>
            <button
              type="button"
              className="text-xs text-slate-300 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            readOnly={!canWrite}
            placeholder="Write your notes..."
            className={[
              'min-h-52 w-full resize-y rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-100 outline-none',
              canWrite ? 'focus:ring-2 focus:ring-sky-500' : 'opacity-70',
            ].join(' ')}
          />
          {!canWrite && (
            <p className="mt-2 text-xs text-slate-400">
              You have been eliminated. Notebook is read-only.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="game-button-secondary px-4 py-2 md:w-auto"
          onClick={() => setIsOpen(true)}
        >
          Open Notebook
        </button>
      )}
    </div>
  );
}
