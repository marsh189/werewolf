import type { ReactNode } from 'react';

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
  endGameButton: ReactNode;
};

export default function RoleRevealScene({
  phaseEndsAt,
  revealState,
  roleName,
  roleToneClass,
  endGameButton,
}: RoleRevealSceneProps) {
  return (
    <div className="game-cinematic-scene min-h-screen flex items-center justify-center px-6 py-12">
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
              {roleName}
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
                ? roleName === 'Werewolf'
                  ? 'Blend in. Strike at night.'
                  : roleName === 'Villager'
                    ? 'Find the werewolves before it is too late.'
                    : 'Use your ability wisely.'
                : ' '}
            </p>
          </div>
        ) : (
          <div className="h-64" />
        )}
        {endGameButton ? <div className="pt-10">{endGameButton}</div> : null}
      </div>
    </div>
  );
}
