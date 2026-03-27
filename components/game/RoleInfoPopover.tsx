import type { Role } from '@/models/roles';
import { ROLES } from '@/models/roles';
import { useState } from 'react';

type RoleInfo = (typeof ROLES)[Role];

type RoleInfoPopoverProps = {
  roleDisplayName: string;
  roleName: string;
  roleInfo: RoleInfo | null;
  hunterShotsRemaining: number;
  trapperAlertsRemaining: number;
  executionerTargetName: string | null;
  executionerTargetUserId: string | null;
};

export default function RoleInfoPopover({
  roleDisplayName,
  roleName,
  roleInfo,
  hunterShotsRemaining,
  trapperAlertsRemaining,
  executionerTargetName,
  executionerTargetUserId,
}: RoleInfoPopoverProps) {
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const show = pinnedOpen || hovered;

  return (
    <div className="relative inline-flex items-center z-40">
      <button
        type="button"
        aria-label={`${roleDisplayName} role info`}
        aria-expanded={show}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-500/60 text-[11px] font-bold text-slate-200 hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-sky-400"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setPinnedOpen(false);
        }}
        onClick={() => setPinnedOpen((prev) => !prev)}
      >
        i
      </button>
      <div
        className={[
          'pointer-events-none absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-md border border-slate-600 bg-slate-900/95 p-2 text-left text-xs text-slate-200 shadow-lg transition-opacity',
          show ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        {roleInfo ? (
          <>
            <p className="leading-tight">{roleInfo.ability}</p>
            <p className="mt-1 leading-tight text-amber-300">
              Win: {roleInfo.winCondition}
            </p>
          </>
        ) : (
          <p className="leading-tight text-slate-300">
            Role information unavailable.
          </p>
        )}
        {roleName === 'Hunter' ? (
          <p className="mt-1 leading-tight text-sky-300">
            Shots remaining: {hunterShotsRemaining}
          </p>
        ) : null}
        {roleName === 'Trapper' ? (
          <p className="mt-1 leading-tight text-sky-300">
            Alerts remaining: {trapperAlertsRemaining}
          </p>
        ) : null}
        {roleName === 'Executioner' ? (
          <p className="mt-1 leading-tight text-violet-300">
            Target: {executionerTargetName ?? executionerTargetUserId ?? 'None'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

