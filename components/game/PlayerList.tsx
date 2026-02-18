import type { ReactNode } from 'react';
import type { LobbyMember } from '@/models/lobby';

type PlayerListProps = {
  members: LobbyMember[];
  renderMemberRow: (member: LobbyMember) => ReactNode;
};

export default function PlayerList({ members, renderMemberRow }: PlayerListProps) {
  return (
    <div className="space-y-3 pt-2">
      {members.length ? (
        members.map((member) => renderMemberRow(member))
      ) : (
        <div className="game-box">
          <span className="text-slate-300 text-sm">
            No players found.
          </span>
        </div>
      )}
    </div>
  );
}
