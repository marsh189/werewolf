import type { ReactNode } from 'react';
import type { NightDeathReveal } from '@/models/lobby';
import type { NightResultRevealState } from '@/models/game';
import { getRoleDisplayName } from '@/models/roles';

type NightResultsSceneProps = {
  revealState: NightResultRevealState;
  revealDeath: NightDeathReveal | null;
  endGameButton: ReactNode;
};

export default function NightResultsScene({
  revealState,
  revealDeath,
  endGameButton,
}: NightResultsSceneProps) {
  const roleLabel = revealDeath?.role ? getRoleDisplayName(revealDeath.role) : 'Unknown';
  const shouldShowRoleReveal = !!(revealDeath?.role || revealDeath?.faction);
  const factionToneClass =
    revealDeath?.faction === 'Village'
      ? 'text-emerald-200 border-emerald-500/30 bg-emerald-500/10'
      : revealDeath?.faction === 'Enemy'
        ? 'text-red-200 border-red-500/30 bg-red-500/10'
        : revealDeath?.faction === 'Neutral'
          ? 'text-violet-200 border-violet-500/30 bg-violet-500/10'
          : 'text-slate-200 border-slate-600/40 bg-slate-800/40';

  return (
    <div className="game-cinematic-scene min-h-[100svh] px-4 sm:px-6 py-10 sm:py-12 flex items-center justify-center">
      <div
        className={[
          'w-full max-w-3xl space-y-6 text-center transition-opacity duration-700',
          revealState === 'fading' ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
      >
        <p
          className={[
            'reveal-prefix transition-all duration-700',
            revealState === 'heading' ||
            revealState === 'line1' ||
            revealState === 'line2' ||
            revealState === 'notebook' ||
            revealState === 'fading'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3',
          ].join(' ')}
        >
          Who Died and How?
        </p>
        <p
          className={[
            'text-4xl md:text-5xl font-black uppercase tracking-[0.04em] transition-all duration-700',
            revealDeath ? 'text-red-300' : 'text-emerald-300',
            revealState === 'line1' ||
            revealState === 'line2' ||
            revealState === 'notebook' ||
            revealState === 'fading'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4',
          ].join(' ')}
        >
          {revealDeath ? `${revealDeath.name} died last night.` : 'No one died last night.'}
        </p>
        <p
          className={[
            'reveal-subtitle transition-all duration-700',
            revealState === 'line2' ||
            revealState === 'notebook' ||
            revealState === 'fading'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3',
          ].join(' ')}
        >
          {revealDeath
            ? revealDeath.eliminationSummary ?? 'They were slain under cover of darkness.'
            : 'Dawn breaks in uneasy silence.'}
        </p>
        {revealDeath ? (
          <div
            className={[
              'mx-auto w-full max-w-2xl space-y-3 transition-all duration-700',
              revealState === 'notebook'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-3',
            ].join(' ')}
          >
            {shouldShowRoleReveal ? (
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-[0.16em]">
                <span className={['rounded-full border px-3 py-1 font-semibold', factionToneClass].join(' ')}>
                  {revealDeath.faction ?? 'Unknown'} Role
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 font-semibold text-slate-100">
                  {roleLabel}
                </span>
              </div>
            ) : null}
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-left text-sm text-slate-200 whitespace-pre-wrap">
              {revealDeath.notebook.trim() || 'No final notes were left behind.'}
            </div>
          </div>
        ) : null}
        {endGameButton ? <div className="pt-6 max-w-xs mx-auto">{endGameButton}</div> : null}
      </div>
    </div>
  );
}
