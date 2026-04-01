'use client';

import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useSoundSettings } from '@/lib/context/soundSettings';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

type HeaderMenuAction = {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  tone?: 'danger' | 'neutral';
};

type HeaderMenuProps = {
  leaveAction?: HeaderMenuAction | null;
  endGameAction?: HeaderMenuAction | null;
};

type PendingAction = HeaderMenuAction | 'signOut' | null;

export default function HeaderMenu({
  leaveAction = null,
  endGameAction = null,
}: HeaderMenuProps) {
  const { data: session } = useSession();
  const { soundEnabled, toggleSoundEnabled } = useSoundSettings();
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!session) return null;

  const confirmConfig =
    pendingAction === 'signOut'
      ? {
          title: 'Sign out?',
          description: 'You will be returned to the home screen.',
          confirmLabel: 'Sign Out',
          confirmTone: 'danger' as const,
          onConfirm: () => {
            setPendingAction(null);
            void signOut();
          },
        }
      : pendingAction
        ? {
            title: pendingAction.title,
            description: pendingAction.description,
            confirmLabel: pendingAction.confirmLabel,
            confirmTone: pendingAction.tone ?? 'danger',
            onConfirm: () => {
              const action = pendingAction;
              setPendingAction(null);
              action.onConfirm();
            },
          }
        : null;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          className={[
            'inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300/80 transition',
            open
              ? 'bg-slate-900/80 text-slate-100'
              : 'bg-transparent hover:bg-slate-900/55 hover:text-slate-100',
          ].join(' ')}
          onClick={() => setOpen((previous) => !previous)}
        >
          <span className="sr-only">Menu</span>
          <span className="flex flex-col gap-[3px]">
            <span className="block h-0.5 w-4 rounded-full bg-current" />
            <span className="block h-0.5 w-4 rounded-full bg-current" />
            <span className="block h-0.5 w-4 rounded-full bg-current" />
          </span>
        </button>

        {open ? (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 z-50 mt-3 w-72 rounded-2xl border border-slate-700/80 bg-slate-950/95 p-3 shadow-2xl">
              <div className="border-b border-slate-800/80 pb-3">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {session.user?.name ?? session.user?.email}
                </p>
              </div>

              <div className="py-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEnabled}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-slate-900/80"
                  onClick={toggleSoundEnabled}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Volume</p>
                    <p className="text-xs text-slate-400">
                      {soundEnabled ? 'Sound on' : 'Sound muted'}
                    </p>
                  </div>
                  <span
                    className={[
                      'inline-flex h-7 w-14 items-center rounded-full border p-1 transition',
                      soundEnabled
                        ? 'justify-end border-emerald-400/60 bg-emerald-500/20'
                        : 'justify-start border-slate-600/60 bg-slate-800/60',
                    ].join(' ')}
                  >
                    <span className="h-5 w-5 rounded-full bg-white/90" />
                  </span>
                </button>
              </div>

              <div className="space-y-1 border-t border-slate-800/80 pt-3">
                {leaveAction ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-100 transition hover:bg-slate-900/80"
                    onClick={() => {
                      setOpen(false);
                      setPendingAction(leaveAction);
                    }}
                  >
                    {leaveAction.label}
                  </button>
                ) : null}

                {endGameAction ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-red-200 transition hover:bg-red-500/10"
                    onClick={() => {
                      setOpen(false);
                      setPendingAction(endGameAction);
                    }}
                  >
                    {endGameAction.label}
                  </button>
                ) : null}

                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-100 transition hover:bg-slate-900/80"
                  onClick={() => {
                    setOpen(false);
                    setPendingAction('signOut');
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {confirmConfig ? (
        <ConfirmDialog
          open
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          confirmTone={confirmConfig.confirmTone}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setPendingAction(null)}
        />
      ) : null}
    </>
  );
}
