import { getRoleDisplayName, ROLES } from '@/models/roles';
import type { Role } from '@/models/roles';
import type { LobbySettingsProps } from '@/models/lobby';
import DurationStepper from './DurationStepper';
import { useEffect, useRef, useState } from 'react';

function RoleInfoPopover({
  role,
  align = 'right',
}: {
  role: Role;
  align?: 'left' | 'right';
}) {
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const open = pinnedOpen;
  const roleDisplayName = getRoleDisplayName(role);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      if (event.target instanceof Node && container.contains(event.target)) return;
      setPinnedOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center z-40">
      <button
        type="button"
        aria-label={`${roleDisplayName} role info`}
        aria-expanded={open}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-500/60 text-[11px] font-bold text-slate-200 hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-sky-400"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setPinnedOpen(false);
        }}
        onClick={() => setPinnedOpen((prev) => !prev)}
      >
        i
      </button>
      <div
        className={[
          'pointer-events-auto absolute top-full z-[999] mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-md border border-slate-600 bg-slate-900/95 p-2 text-left text-xs text-slate-200 shadow-lg transition-opacity',
          align === 'left'
            ? 'left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0'
            : 'right-0',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      >
        <p className="leading-tight">{ROLES[role].ability}</p>
        <p className="mt-1 leading-tight text-amber-300">
          Win: {ROLES[role].winCondition}
        </p>
      </div>
    </div>
  );
}

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

  const minWerewolves = specialRolesEnabled ? 2 : 1;

  const possibleRoles = (Object.keys(ROLES) as Role[]).filter(
    (role) =>
      role !== 'Villager' &&
      role !== 'Werewolf' &&
      (neutralRolesEnabled || ROLES[role].faction !== 'Neutral'),
  );

  const renderRoleInfo = (role: Role, align: 'left' | 'right') => (
    <RoleInfoPopover role={role} align={align} />
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

      <div className="game-box game-box-role flex items-start justify-between gap-3 py-3 sm:py-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-100">
            Special Roles
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-slate-300/80 leading-snug">
            Adds special villager and werewolf roles.
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
            'shrink-0 inline-flex h-8 w-16 sm:w-20 items-center rounded-full border p-1 transition',
            specialRolesEnabled
              ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
              : 'border-slate-500/50 bg-slate-700/30 text-slate-200',
            specialRolesEnabled ? 'justify-end' : 'justify-start',
            !isHost ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          ].join(' ')}
        >
          <span className="h-6 w-6 shrink-0 rounded-full bg-white/90 transition" />
        </button>
      </div>

      {specialRolesEnabled ? (
        <div className="game-box game-box-role flex items-start justify-between gap-3 py-3 sm:py-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100">
              Neutral Roles
            </div>
            <p className="mt-1 text-[11px] sm:text-xs text-slate-300/80 leading-snug">
              Adds neutral roles with unique win conditions.
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
              'shrink-0 inline-flex h-8 w-16 sm:w-20 items-center rounded-full border p-1 transition',
              neutralRolesEnabled
                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
                : 'border-slate-500/50 bg-slate-700/30 text-slate-200',
              neutralRolesEnabled ? 'justify-end' : 'justify-start',
              !isHost ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            ].join(' ')}
          >
            <span className="h-6 w-6 shrink-0 rounded-full bg-white/90 transition" />
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
                    werewolfCount > minWerewolves
                      ? 'border-red-500/30 text-red-200 hover:bg-red-500/10'
                      : 'border-red-500/10 text-red-200/40 cursor-not-allowed',
                  ].join(' ')}
                  onClick={() =>
                    onWerewolfChange(Math.max(minWerewolves, werewolfCount - 1))
                  }
                  disabled={werewolfCount <= minWerewolves}
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
          <div className="space-y-2 pt-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300/80">
              Possible Roles
            </p>
            <div className="grid grid-cols-2 gap-2 overflow-visible">
              {possibleRoles.map((role, index) => (
                (() => {
                  const roleDisplayName = getRoleDisplayName(role);
                  const align = index % 2 === 0 ? 'left' : 'right';
                  return (
                    <div
                      key={role}
                      className={[
                        'game-box py-2 relative overflow-visible hover:z-50 focus-within:z-50',
                        ROLES[role].faction === 'Neutral'
                          ? 'bg-gradient-to-r from-slate-500/20 to-slate-700/20 border-slate-500/40 text-slate-200'
                          : ROLES[role].faction === 'Enemy'
                            ? 'game-box-werewolf'
                          : 'game-box-role',
                      ].join(' ')}
                    >
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30">
                        {renderRoleInfo(role, align)}
                      </div>
                      <div className="pr-8">
                        <span>{roleDisplayName}</span>
                      </div>
                    </div>
                  );
                })()
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
