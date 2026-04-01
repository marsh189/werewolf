'use client';

import type { GamePhase } from '@/models/game';

type TrapperAlertButtonProps = {
  lobbyName: string | null | undefined;
  currentPhase: GamePhase;
  effectiveDisplayPhase: GamePhase;
  roleName: string;
  selfAlive: boolean;
  trapperAlertActive: boolean;
  trapperAlertsRemaining: number | null;
  onToggle: (lobbyName: string) => void;
};

export default function TrapperAlertButton({
  lobbyName,
  currentPhase,
  effectiveDisplayPhase,
  roleName,
  selfAlive,
  trapperAlertActive,
  trapperAlertsRemaining,
  onToggle,
}: TrapperAlertButtonProps) {
  if (
    effectiveDisplayPhase !== 'night' ||
    roleName !== 'Trapper' ||
    !selfAlive
  ) {
    return null;
  }

  const disabled =
    currentPhase !== 'night' ||
    (!trapperAlertActive && (trapperAlertsRemaining ?? 0) <= 0);

  return (
    <button
      type="button"
      className={[
        'game-button-secondary max-w-xs mx-auto',
        trapperAlertActive
          ? 'game-button-alert-active'
          : (trapperAlertsRemaining ?? 0) > 0
            ? 'game-button-alert-ready'
            : '',
        'disabled:cursor-not-allowed disabled:opacity-100',
      ].join(' ')}
      disabled={disabled}
      onClick={() => {
        if (!lobbyName || currentPhase !== 'night') return;
        onToggle(lobbyName);
      }}
    >
      {trapperAlertActive ? (
        <span className="flex flex-col items-center justify-center leading-tight">
          <span className="inline-flex items-center justify-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            Alert Active
          </span>
          <span className="mt-1 text-[11px] font-semibold text-emerald-100/90">
            Click to deactivate
          </span>
        </span>
      ) : (trapperAlertsRemaining ?? 0) <= 0 ? (
        <span className="flex flex-col items-center justify-center leading-tight">
          <span>No Alerts Remaining</span>
        </span>
      ) : (
        <span className="flex flex-col items-center justify-center leading-tight">
          <span>Activate Alert</span>
        </span>
      )}
    </button>
  );
}
