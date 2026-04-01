import { getRoleDisplayName, ROLES } from '@/models/roles';
import type { Role } from '@/models/roles';

type RoleRevealState =
  | 'hidden'
  | 'titlePre'
  | 'title'
  | 'rolePre'
  | 'role'
  | 'fading';

type RoleRevealSceneProps = {
  phaseEndsAt: number | null;
  revealState: RoleRevealState;
  roleName: string;
  roleToneClass: string;
};

export default function RoleRevealScene({
  phaseEndsAt,
  revealState,
  roleName,
  roleToneClass,
}: RoleRevealSceneProps) {
  const roleDisplayName = getRoleDisplayName(roleName);
  const roleRevealSummary =
    roleName in ROLES
      ? ROLES[roleName as Role].revealSummary
      : 'Hold your nerve. Dawn reveals all truths.';

  return (
    <div className="game-cinematic-scene min-h-[100svh] flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
      <div className="w-full max-w-3xl text-center">
        {revealState !== 'hidden' ? (
          <div
            key={phaseEndsAt ?? 'role-reveal'}
            className={[
              'space-y-7 transition-all duration-700 ease-in-out',
              'will-change-[opacity,transform]',
              revealState === 'fading'
                ? 'opacity-0 -translate-y-2'
                : 'opacity-100 translate-y-0',
            ].join(' ')}
          >
            <p
              className={[
                'reveal-prefix transition-opacity duration-700 ease-in-out',
                revealState === 'titlePre' ? 'opacity-0' : 'opacity-100',
              ].join(' ')}
            >
              Your Role
            </p>
            <h1
              className={[
                'reveal-role transition-opacity duration-700 ease-in-out',
                revealState === 'role' || revealState === 'fading'
                  ? `${roleToneClass} opacity-100`
                  : 'reveal-role-placeholder opacity-0',
              ].join(' ')}
            >
              {roleDisplayName}
            </h1>
            <p
              className={[
                'reveal-subtitle transition-opacity duration-700 ease-in-out',
                revealState === 'role' || revealState === 'fading'
                  ? 'opacity-100'
                  : 'opacity-0',
              ].join(' ')}
            >
              {revealState === 'role' ||
              revealState === 'rolePre' ||
              revealState === 'fading'
                ? roleRevealSummary
                : ' '}
            </p>
          </div>
        ) : (
          <div className="h-64" />
        )}
      </div>
    </div>
  );
}
