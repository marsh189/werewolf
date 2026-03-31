'use client';

import type { LobbyMember } from '@/models/lobby';
import { formatLobbyMemberName } from '@/lib/formatters/nameFormatters';
import { updateLobbyDisplayName } from '@/lib/actions/lobbySocketActions';
import { useEffect, useMemo, useRef, useState } from 'react';

type LobbyMembersListProps = {
  members: LobbyMember[];
  hostUserId: string;
  currentUserId?: string;
  lobbyName?: string;
  nameLocked?: boolean;
};

export default function LobbyMembersList({
  members,
  hostUserId,
  currentUserId,
  lobbyName,
  nameLocked = false,
}: LobbyMembersListProps) {
  const [isEditingSelf, setIsEditingSelf] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const selfMember = useMemo(
    () => members.find((m) => m.userId === currentUserId) ?? null,
    [members, currentUserId],
  );

  useEffect(() => {
    if (!isEditingSelf) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditingSelf]);

  const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ');

  const commitSelfName = () => {
    if (!lobbyName || !currentUserId) return;

    setError(null);
    if (nameLocked) {
      setError('Names are locked during the countdown.');
      return;
    }
    const normalized = normalizeName(draftName);
    if (!normalized) {
      setError('Name cannot be empty.');
      return;
    }

    if (normalized.length > 40) {
      setError('Name must be 40 characters or fewer.');
      return;
    }

    if (normalized === (selfMember?.name ?? '')) {
      setIsEditingSelf(false);
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    updateLobbyDisplayName(lobbyName, normalized, (_err, res) => {
      setIsSaving(false);
      if (!res?.ok) {
        setError(res?.error ?? 'Failed to update name.');
        return;
      }
      setDraftName('');
      setIsEditingSelf(false);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="game-section-title">Players</h2>
      </div>

      <div className="space-y-2">
        {error ? (
          <div className="game-box py-2 border-red-500/30 bg-red-500/10">
            <span className="text-red-200 text-sm">{error}</span>
          </div>
        ) : null}
        {members.length ? (
          members.map((member) => (
            <div key={member.userId} className="game-box py-2">
              <div className="flex items-center gap-2 min-w-0">
                {member.userId === currentUserId && isEditingSelf ? (
                  <input
                    ref={inputRef}
                    className="w-44 sm:w-56 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Enter display name..."
                    disabled={isSaving}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitSelfName();
                      if (e.key === 'Escape') {
                        setError(null);
                        setDraftName('');
                        setIsEditingSelf(false);
                      }
                    }}
                  />
                ) : (
                  <span
                    className="text-white font-semibold truncate"
                    title={member.name}
                  >
                    {formatLobbyMemberName(member.name)}
                  </span>
                )}

                {member.userId === currentUserId && !nameLocked ? (
                  <button
                    type="button"
                    aria-label={isEditingSelf ? 'Confirm name' : 'Edit name'}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-transparent text-slate-300/80 opacity-70 transition hover:bg-slate-800/60 hover:text-slate-100 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={!lobbyName || isSaving}
                    onClick={() => {
                      setError(null);

                      if (isEditingSelf) {
                        commitSelfName();
                        return;
                      }

                      setDraftName(member.name ?? '');
                      setIsEditingSelf(true);
                    }}
                  >
                    {isEditingSelf ? <CheckIcon /> : <EditIcon />}
                  </button>
                ) : null}
              </div>

              <span className="text-xs text-slate-400">
                {member.userId === hostUserId ? 'Host' : ''}
              </span>
            </div>
          ))
        ) : (
          <div className="game-box py-2">
            <span className="text-slate-300">
              No members yet (or still loading)...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
