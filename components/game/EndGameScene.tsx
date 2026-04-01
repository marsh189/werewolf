type EndGameSceneProps = {
  didWin: boolean | null;
  winningFaction: 'Village' | 'Enemy' | 'Executioner' | 'Jester' | null;
};

export default function EndGameScene({
  didWin,
  winningFaction,
}: EndGameSceneProps) {
  const outcome = winningFaction ?? 'Village';

  const { title, subtitle } = (() => {
    if (outcome === 'Executioner') {
      return {
        title: 'Executioner Wins',
        subtitle:
          didWin === true
            ? 'Your target was executed by vote.'
            : didWin === false
              ? 'A target was executed by vote. The Executioner claims victory.'
              : 'A target was executed by vote.',
      };
    }

    if (outcome === 'Jester') {
      return {
        title: 'Jester Wins',
        subtitle:
          didWin === true
            ? 'You were executed by vote. Chaos wins.'
            : didWin === false
              ? 'The Jester was executed by vote. Chaos wins.'
              : 'A Jester was executed by vote.',
      };
    }

    if (outcome === 'Enemy') {
      return {
        title: 'Werewolves Win',
        subtitle:
          didWin === true
            ? 'The village has fallen. You prevailed.'
            : didWin === false
              ? 'The village has fallen. You did not prevail.'
              : 'The village has fallen.',
      };
    }

    return {
      title: 'Villagers Win',
      subtitle:
        didWin === true
          ? 'The last werewolf has fallen. You survived.'
        : didWin === false
            ? 'The last werewolf has fallen. You did not prevail.'
            : 'The last werewolf has fallen.',
    };
  })();

  return (
    <div className="game-cinematic-scene min-h-[100svh] flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
      <div className="w-full max-w-4xl text-center space-y-6">
        <p className="reveal-prefix">Game Over</p>
        <h1
          className={[
            'text-5xl md:text-6xl font-black uppercase tracking-[0.06em]',
            didWin === true
              ? 'text-emerald-300'
              : didWin === false
                ? 'text-red-400'
                : 'text-slate-200',
          ].join(' ')}
        >
          {title}
        </h1>
        <p className="reveal-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}
