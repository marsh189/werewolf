import type { KeyboardEvent } from 'react';

type LobbyCardProps = {
  lobbyName: string;
  memberCount: number;
  status: boolean;
  onJoin: (lobbyName: string) => void;
};

export default function LobbyCard({
  lobbyName,
  memberCount,
  status,
  onJoin,
}: LobbyCardProps) {
  const handleJoin = () => onJoin(lobbyName);

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleJoin();
    }
  };

  return (
    <tr
      className="cursor-pointer border-b border-slate-700/60 transition-colors hover:bg-slate-800/60 last:border-b-0"
      role="button"
      tabIndex={0}
      onClick={handleJoin}
      onKeyDown={handleKeyDown}
    >
      <td className="pl-3 py-3 text-[15px] font-medium text-left">
        {lobbyName}
      </td>
      <td className="pr-3 py-3 text-[15px] text-slate-300 text-right">
        {memberCount}
      </td>
      <td
        className={`pr-3 py-3 text-[15px] text-right font-semibold ${
          status ? 'text-red-400' : 'text-emerald-300'
        }`}
      >
        {status ? 'Playing' : 'Open'}
      </td>
    </tr>
  );
}
