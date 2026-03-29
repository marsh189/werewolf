'use client';

import RoleInfoPopover from '@/components/game/RoleInfoPopover';
import { ROLES } from '@/models/roles';
import type { Role } from '@/models/roles';

/* =============================================================================
   Player Role Card
   
   Compact, readable header card that shows:
   - the player's current role
   - a small faction badge
   - an info popover button for ability + win condition
   
   This replaces the older single-row "Role + info" layout, which could feel
   cramped on small screens and with long role names.
============================================================================= */

export default function PlayerRoleCard({
  roleName,
  roleDisplayName,
  roleInfo,
  hunterShotsRemaining,
  trapperAlertsRemaining,
  executionerTargetName,
  executionerTargetUserId,
}: {
  roleName: string;
  roleDisplayName: string;
  roleInfo: ((typeof ROLES)[Role]) | null;
  hunterShotsRemaining: number;
  trapperAlertsRemaining: number;
  executionerTargetName: string | null;
  executionerTargetUserId: string | null;
}) {
  return (
    <div
      className={[
        'game-box w-full sm:w-auto shrink-0 text-left sm:min-w-[13rem]',
        // Keep the role readable without making the header feel tall.
        'flex-col items-start justify-start gap-1.5 px-5 py-3',
      ].join(' ')}
    >
      <div className="w-full flex items-center justify-between gap-3">
        <p className="game-tight-label">Your role</p>
        <RoleInfoPopover
          roleDisplayName={roleDisplayName}
          roleName={roleName}
          roleInfo={roleInfo}
          hunterShotsRemaining={hunterShotsRemaining}
          trapperAlertsRemaining={trapperAlertsRemaining}
          executionerTargetName={executionerTargetName}
          executionerTargetUserId={executionerTargetUserId}
        />
      </div>

      <p className="w-full font-bold text-slate-100 text-base sm:text-lg leading-tight break-words">
        {roleDisplayName}
      </p>
    </div>
  );
}
