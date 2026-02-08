import { useMemo, useState } from 'react';
import { ROLES } from '@/models/roles';
import type { LobbySettingsProps } from '@/models/lobby';

export default function LobbySettings({
  isHost,
  werewolfCount,
  extraRoles,
  phaseDurations,
  onWerewolfChange,
  onAddRole,
  onRemoveRole,
  onPhaseChange,
}: LobbySettingsProps) {
  const [rolePickerValue, setRolePickerValue] = useState<string>('DEFAULT');

  const formatSeconds = (totalSeconds: number) => {
    const clamped = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(clamped / 60);
    const seconds = clamped % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const newRoles = useMemo(
    () =>
      ROLES.filter(
        (role) =>
          !extraRoles.includes(role) &&
          role !== 'Villager' &&
          role !== 'Werewolf',
      ),
    [extraRoles],
  );

  const addRole = (value: string) => {
    if (!value || value === 'DEFAULT') return;
    setRolePickerValue('DEFAULT');
    onAddRole(value);
  };

  return (
    <div className="space-y-5">
      <div className="pt-4 space-y-3">
        <label className="game-label">Timers</label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="game-section-title">
              Day
            </label>
            <div className="flex items-center justify-between gap-4">
              <span className="min-w-[4ch] text-center">
                {formatSeconds(phaseDurations.daySeconds)}
              </span>
              {isHost && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={[
                      'px-2 py-1 rounded-md border transition',
                      phaseDurations.daySeconds > 60
                        ? 'border-slate-600/60 text-slate-200 hover:bg-slate-800/40'
                        : 'border-slate-600/20 text-slate-200/40 cursor-not-allowed',
                    ].join(' ')}
                    onClick={() =>
                      onPhaseChange({
                        ...phaseDurations,
                        daySeconds: Math.max(
                          60,
                          phaseDurations.daySeconds - 30,
                        ),
                      })
                    }
                    disabled={phaseDurations.daySeconds <= 60}
                    aria-label="Decrease day timer"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-md border border-slate-600/60 text-slate-200 hover:bg-slate-800/40 transition"
                    onClick={() =>
                      onPhaseChange({
                        ...phaseDurations,
                        daySeconds: phaseDurations.daySeconds + 30,
                      })
                    }
                    aria-label="Increase day timer"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="game-section-title">
              Night
            </label>
            <div className="flex items-center justify-between gap-4">
              <span className="min-w-[4ch] text-center">
                {formatSeconds(phaseDurations.nightSeconds)}
              </span>
              {isHost && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={[
                      'px-2 py-1 rounded-md border transition',
                      phaseDurations.nightSeconds > 60
                        ? 'border-slate-600/60 text-slate-200 hover:bg-slate-800/40'
                        : 'border-slate-600/20 text-slate-200/40 cursor-not-allowed',
                    ].join(' ')}
                    onClick={() =>
                      onPhaseChange({
                        ...phaseDurations,
                        nightSeconds: Math.max(
                          60,
                          phaseDurations.nightSeconds - 30,
                        ),
                      })
                    }
                    disabled={phaseDurations.nightSeconds <= 60}
                    aria-label="Decrease night timer"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-md border border-slate-600/60 text-slate-200 hover:bg-slate-800/40 transition"
                    onClick={() =>
                      onPhaseChange({
                        ...phaseDurations,
                        nightSeconds: phaseDurations.nightSeconds + 30,
                      })
                    }
                    aria-label="Increase night timer"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="game-section-title">
              Voting
            </label>
            <div className="flex items-center justify-between gap-4">
              <span className="min-w-[4ch] text-center">
                {formatSeconds(phaseDurations.voteSeconds)}
              </span>
              {isHost && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={[
                      'px-2 py-1 rounded-md border transition',
                      phaseDurations.voteSeconds > 30
                        ? 'border-slate-600/60 text-slate-200 hover:bg-slate-800/40'
                        : 'border-slate-600/20 text-slate-200/40 cursor-not-allowed',
                    ].join(' ')}
                    onClick={() =>
                      onPhaseChange({
                        ...phaseDurations,
                        voteSeconds: Math.max(
                          30,
                          phaseDurations.voteSeconds - 30,
                        ),
                      })
                    }
                    disabled={phaseDurations.voteSeconds <= 30}
                    aria-label="Decrease vote timer"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-md border border-slate-600/60 text-slate-200 hover:bg-slate-800/40 transition"
                    onClick={() =>
                      onPhaseChange({
                        ...phaseDurations,
                        voteSeconds: phaseDurations.voteSeconds + 30,
                      })
                    }
                    aria-label="Increase vote timer"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <label className="game-label">Roles</label>

      <div className="space-y-3">
        <div className="game-box game-box-werewolf">
          <span>Werewolf</span>
          <div className="flex items-center gap-4 text-sm">
            <span className="min-w-[2ch] text-center">x{werewolfCount}</span>
            {isHost && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={[
                    'px-2 py-1 rounded-md border transition',
                    werewolfCount > 1
                      ? 'border-red-500/30 text-red-200 hover:bg-red-500/10'
                      : 'border-red-500/10 text-red-200/40 cursor-not-allowed',
                  ].join(' ')}
                  onClick={() =>
                    onWerewolfChange(Math.max(1, werewolfCount - 1))
                  }
                  disabled={werewolfCount <= 1}
                  aria-label="Decrease werewolf count"
                >
                  -
                </button>
                <button
                  type="button"
                  className="px-2 py-1 rounded-md border border-red-500/30 text-red-200 hover:bg-red-500/10 transition"
                  onClick={() => onWerewolfChange(werewolfCount + 1)}
                  aria-label="Increase werewolf count"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        {extraRoles.map((role) => (
          <div key={role} className="game-box game-box-role">
            <span>{role}</span>
            {isHost && (
              <button
                type="button"
                onClick={() => onRemoveRole(role)}
                className="text-xs text-red-400 hover:text-red-300 transition"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {isHost && newRoles.length > 0 && (
        <div className="pt-2">
          <select
            value={rolePickerValue}
            onChange={(e) => addRole(e.target.value)}
            className="game-input"
          >
            <option value="DEFAULT" disabled>
              Add New Role
            </option>
            {newRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
