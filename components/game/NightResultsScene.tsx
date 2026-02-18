import type { ReactNode } from 'react';
import type { NightDeathReveal } from '@/models/lobby';
import type { NightResultRevealState } from '@/models/game';

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
  return (
    <div className="game-cinematic-scene min-h-screen px-6 py-12 flex items-center justify-center">
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
            ? 'They were slain under cover of darkness.'
            : 'Dawn breaks in uneasy silence.'}
        </p>
        {revealDeath ? (
          <div
            className={[
              'mx-auto w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-left text-sm text-slate-200 whitespace-pre-wrap transition-all duration-700',
              revealState === 'notebook'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-3',
            ].join(' ')}
          >
            {revealDeath.notebook.trim() || 'No final notes were left behind.'}
          </div>
        ) : null}
        {endGameButton ? <div className="pt-6 max-w-xs mx-auto">{endGameButton}</div> : null}
      </div>
    </div>
  );
}
