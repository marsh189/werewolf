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
    <div className="flex flex-col items-start gap-2 mb-3 sm:flex-row sm:items-center sm:gap-3">
      <h1 className="game-title text-left leading-tight">{lobbyName}</h1>
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
