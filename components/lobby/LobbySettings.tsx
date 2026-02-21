import { ROLES } from '@/models/roles';
import type { Role } from '@/models/roles';
import type { LobbySettingsProps } from '@/models/lobby';
import DurationStepper from './DurationStepper';

export default function LobbySettings({
  isHost,
  werewolfCount,
  specialRolesEnabled,
  neutralRolesEnabled,
  phaseDurations,
  onWerewolfChange,
  onSpecialRolesEnabledChange,
  onNeutralRolesEnabledChange,
  onPhaseChange,
}: LobbySettingsProps) {
  const formatSeconds = (totalSeconds: number) => {
    const clamped = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(clamped / 60);
    const seconds = clamped % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const possibleRoles = (Object.keys(ROLES) as Role[]).filter(
    (role) =>
      role !== 'Villager' &&
      role !== 'Werewolf' &&
      (neutralRolesEnabled || ROLES[role].faction !== 'Neutral'),
  );

  const renderRoleInfo = (role: Role) => (
    <div className="relative inline-flex items-center group z-40">
      <button
        type="button"
        aria-label={`${role} role info`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-500/60 text-[11px] font-bold text-slate-200 hover:bg-slate-700/60"
      >
        i
      </button>
      <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-md border border-slate-600 bg-slate-900/95 p-2 text-left text-xs text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <p className="leading-tight">{ROLES[role].ability}</p>
        <p className="mt-1 leading-tight text-amber-300">
          Win: {ROLES[role].winCondition}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="pt-1 space-y-2">
        <label className="game-label">Timers</label>
        <div className="space-y-2">
          <DurationStepper
            label="Day"
            valueSeconds={phaseDurations.daySeconds}
            minSeconds={10}
            isHost={isHost}
            onChange={(nextSeconds) =>
              onPhaseChange({
                ...phaseDurations,
                daySeconds: nextSeconds,
              })
            }
            formatSeconds={formatSeconds}
          />
          <DurationStepper
            label="Night"
            valueSeconds={phaseDurations.nightSeconds}
            minSeconds={10}
            isHost={isHost}
            onChange={(nextSeconds) =>
              onPhaseChange({
                ...phaseDurations,
                nightSeconds: nextSeconds,
              })
            }
            formatSeconds={formatSeconds}
          />
          <DurationStepper
            label="Voting"
            valueSeconds={phaseDurations.voteSeconds}
            minSeconds={10}
            isHost={isHost}
            onChange={(nextSeconds) =>
              onPhaseChange({
                ...phaseDurations,
                voteSeconds: nextSeconds,
              })
            }
            formatSeconds={formatSeconds}
          />
        </div>
      </div>

      <label className="game-label">Roles</label>

      <div className="game-box game-box-role flex items-center justify-between gap-3 py-2">
        <div>
          <div className="font-semibold text-slate-100">
            Special Villager Roles
          </div>
          <p className="text-xs text-slate-300/80 leading-tight">
            Play with basic roles or use special villager roles.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={specialRolesEnabled}
          aria-label="Toggle special roles"
          disabled={!isHost}
          onClick={() => onSpecialRolesEnabledChange(!specialRolesEnabled)}
          className={[
            'relative inline-flex h-8 w-20 items-center rounded-full border px-2 transition',
            specialRolesEnabled
              ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
              : 'border-slate-500/50 bg-slate-700/30 text-slate-200',
            !isHost ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          ].join(' ')}
        >
          <span
            className={[
              'absolute h-6 w-6 rounded-full bg-white/90 transition-transform',
              specialRolesEnabled ? 'translate-x-11' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>

      {specialRolesEnabled ? (
        <div className="game-box game-box-role flex items-center justify-between gap-3 py-2">
          <div>
            <div className="font-semibold text-slate-100">Neutral Roles</div>
            <p className="text-xs text-slate-300/80 leading-tight">
              Include neutral win-condition roles in the game.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={neutralRolesEnabled}
            aria-label="Toggle neutral roles"
            disabled={!isHost}
            onClick={() => onNeutralRolesEnabledChange(!neutralRolesEnabled)}
            className={[
              'relative inline-flex h-8 w-20 items-center rounded-full border px-2 transition',
              neutralRolesEnabled
                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
                : 'border-slate-500/50 bg-slate-700/30 text-slate-200',
              !isHost ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            ].join(' ')}
          >
            <span
              className={[
                'absolute h-6 w-6 rounded-full bg-white/90 transition-transform',
                neutralRolesEnabled ? 'translate-x-11' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="game-box game-box-werewolf py-2">
          <span>Werewolf</span>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="min-w-[2ch] text-center">x{werewolfCount}</span>
            {isHost && (
              <div className="flex items-center gap-2">
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

        {specialRolesEnabled ? (
          <div className="grid grid-cols-2 gap-2 overflow-visible">
            {possibleRoles.map((role) => (
              <div
                key={role}
                className={[
                  'game-box py-2 relative overflow-visible hover:z-30 focus-within:z-30',
                  ROLES[role].faction === 'Neutral'
                    ? 'bg-gradient-to-r from-slate-500/20 to-slate-700/20 border-slate-500/40 text-slate-200'
                    : 'game-box-role',
                ].join(' ')}
              >
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30">
                  {renderRoleInfo(role)}
                </div>
                <div className="pr-8">
                  <span>{role}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
