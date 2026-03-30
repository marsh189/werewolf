'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { DESKTOP_MEDIA_QUERY } from '@/lib/constants/uiConstants';
import { getNotebookStorageKey } from '@/lib/constants/storageKeys';

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
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const lastSentNotesRef = useRef<string>('');
  const sendNotesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = useMemo(() => {
    if (!lobbyName || !userId) return null;
    return getNotebookStorageKey(lobbyName, userId);
  }, [lobbyName, userId]);

  useEffect(() => {
    if (!storageKey) return;

    if (sendNotesTimeoutRef.current) clearTimeout(sendNotesTimeoutRef.current);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    sendNotesTimeoutRef.current = null;
    idleTimeoutRef.current = null;

    let initialNotes = '';
    try {
      const existing = window.localStorage.getItem(storageKey);
      initialNotes = existing ?? '';
    } catch {
      initialNotes = '';
    }
    const id = setTimeout(() => {
      setNotes(initialNotes);
      lastSentNotesRef.current = initialNotes;
      setSaveState('idle');
    }, 0);
    return () => clearTimeout(id);
  }, [storageKey]);

  useEffect(() => {
    return () => {
      if (sendNotesTimeoutRef.current) clearTimeout(sendNotesTimeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, notes);
    } catch {
      // Ignore persistence failures (private mode / storage restrictions)
    }
  }, [storageKey, notes]);

  const scheduleSend = (nextNotes: string) => {
    if (!canWrite) return;
    if (!onNotesChange) return;
    if (nextNotes === lastSentNotesRef.current) return;

    setSaveState('saving');

    if (sendNotesTimeoutRef.current) clearTimeout(sendNotesTimeoutRef.current);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

    sendNotesTimeoutRef.current = setTimeout(() => {
      onNotesChange(nextNotes);
      lastSentNotesRef.current = nextNotes;
      setSaveState('saved');

      idleTimeoutRef.current = setTimeout(() => {
        setSaveState('idle');
      }, 1200);
    }, 650);
  };

  const statusLabel =
    !canWrite
      ? 'Read-only'
      : saveState === 'saving'
        ? 'Saving...'
        : saveState === 'saved'
          ? 'Saved'
          : '';

  if (!isDesktop && isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
        <div className="w-full rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="game-section-title">Notebook</h2>
              {statusLabel ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {statusLabel}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => {
              const nextNotes = e.target.value;
              setNotes(nextNotes);
              scheduleSend(nextNotes);
            }}
            readOnly={!canWrite}
            placeholder="Write your notes..."
            className={[
              'h-[min(60svh,26rem)] w-full resize-none rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-100 outline-none',
              canWrite ? 'focus:ring-2 focus:ring-sky-500' : 'opacity-70',
            ].join(' ')}
          />
          {!canWrite && (
            <p className="mt-2 text-xs text-slate-400">
              You have been eliminated. Notebook is read-only.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        'fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40',
        isOpen ? 'w-[min(92vw,24rem)]' : 'w-auto',
      ].join(' ')}
    >
      {isOpen ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="game-section-title">Notebook</h2>
              {statusLabel ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {statusLabel}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="text-xs text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => {
              const nextNotes = e.target.value;
              setNotes(nextNotes);
              scheduleSend(nextNotes);
            }}
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
          aria-label="Open notebook"
          title="Open notebook"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900/95 text-slate-100 shadow-2xl transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80"
          onClick={() => setIsOpen(true)}
        >
          <span className="text-lg leading-none" aria-hidden="true">
            {'\u270E'}
          </span>
        </button>
      )}
    </div>
  );
}
