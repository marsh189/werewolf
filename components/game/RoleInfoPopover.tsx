import type { Role } from '@/models/roles';
import { ROLES } from '@/models/roles';
import InfoPopover from '@/components/shared/InfoPopover';

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
  return (
    <InfoPopover
      ariaLabel={`${roleDisplayName} role info`}
      align="right"
      widthClassName="w-72"
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
    </InfoPopover>
  );
}
