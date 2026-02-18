type LobbyHeaderStatusProps = {
  lobbyName: string;
  started: boolean;
  startingRemainingSeconds: number | null;
};

export default function LobbyHeaderStatus({
  lobbyName,
  started,
  startingRemainingSeconds,
}: LobbyHeaderStatusProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <h1 className="game-title text-left">{lobbyName}</h1>
      <span
        className={[
          'px-3 py-1 rounded-full text-xs font-semibold border',
          started
            ? 'bg-red-500/10 text-red-200 border-red-500/30'
            : 'bg-sky-500/10 text-sky-200 border-sky-500/30',
        ].join(' ')}
      >
        {started
          ? 'In Progress'
          : startingRemainingSeconds !== null
            ? `Starting... ${startingRemainingSeconds}`
            : 'Waiting'}
      </span>
    </div>
  );
}
