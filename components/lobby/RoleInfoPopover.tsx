import { getRoleDisplayName, ROLES } from '@/models/roles';
import type { Role } from '@/models/roles';
import InfoPopover from '@/components/shared/InfoPopover';

type Props = {
  role: Role;
  align?: 'left' | 'right';
};

export default function RoleInfoPopover({ role, align = 'right' }: Props) {
  const roleDisplayName = getRoleDisplayName(role);

  return (
    <InfoPopover
      ariaLabel={`${roleDisplayName} role info`}
      align={align}
      widthClassName="w-64"
    >
      <p className="leading-tight">{ROLES[role].ability}</p>
      <p className="mt-1 leading-tight text-amber-300">
        Win: {ROLES[role].winCondition}
      </p>
    </InfoPopover>
  );
}
