import type { ReactNode } from 'react';
import PhaseTimer from '@/components/game/PhaseTimer';

type EndGameSceneProps = {
  phaseEndsAt: number | null;
  didWin: boolean | null;
  endGameButton: ReactNode;
};

export default function EndGameScene({
  phaseEndsAt,
  didWin,
  endGameButton,
}: EndGameSceneProps) {
  const title = 'Village Victory';
  const subtitle =
    didWin === true
      ? 'The last werewolf has fallen. You survived.'
      : didWin === false
        ? 'The last werewolf has fallen. You did not prevail.'
        : 'The last werewolf has fallen.';

  return (
    <div className="game-cinematic-scene min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-3xl text-center space-y-6">
        <p className="reveal-prefix">Game Over</p>
        <h1
          className={[
            'text-5xl md:text-6xl font-black uppercase tracking-[0.06em]',
            didWin === true ? 'text-emerald-300' : 'text-slate-200',
          ].join(' ')}
        >
          {title}
        </h1>
        <p className="reveal-subtitle">{subtitle}</p>
        <div className="pt-2 flex flex-col items-center gap-4">
          <PhaseTimer phaseEndsAt={phaseEndsAt} />
          {endGameButton ? <div className="max-w-xs mx-auto">{endGameButton}</div> : null}
        </div>
      </div>
    </div>
  );
}

