import type { LobbyMember } from '@/models/lobby';

type LobbyMembersListProps = {
  members: LobbyMember[];
  hostUserId: string;
};

export default function LobbyMembersList({
  members,
  hostUserId,
}: LobbyMembersListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="game-section-title">Players</h2>
      </div>

      <div className="space-y-2">
        {members.length ? (
          members.map((member) => (
            <div key={member.userId} className="game-box py-2">
              <span className="text-white font-semibold">{member.name}</span>

              <span className="text-xs text-slate-400">
                {member.userId === hostUserId ? 'Host' : ''}
              </span>
            </div>
          ))
        ) : (
          <div className="game-box py-2">
            <span className="text-slate-300">
              No members yet (or still loading)...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
