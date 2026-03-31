import { CLIENT_EVENTS } from '../../events.js';
import { isRapidAction } from '../../../services/index.js';
import { logInfo } from '../../../logger.js';
import {
  requireAckAndLobby,
  requireAliveActor,
  requireAliveTargetMember,
  requireGamePhase,
  requireLobbyMembership,
  requireTargetUserId,
} from '../shared.js';

/* =============================================================================
   Game Handlers: Voting
============================================================================= */

export const registerVoteHandlers = ({ socket, user }) => {
  socket.on(CLIENT_EVENTS.GAME_CAST_VOTE, (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (!requireGamePhase(lobby, 'vote', ack, 'Not in voting phase')) return;
    if (!requireAliveActor(lobby, user.id, ack, 'Dead players cannot vote')) return;
    if (
      !requireAliveTargetMember(
        lobby,
        targetUserId,
        ack,
        'Votes can only target alive players',
      )
    ) {
      return;
    }
    if (isRapidAction(lobby, user.id, 'castVote')) {
      logInfo('vote_throttled', { userId: user.id, lobbyName: lobby.name });
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.currentVotes) {
      lobby.currentVotes = new Map();
    }
    const currentSelection = lobby.currentVotes.get(user.id) ?? null;
    if (currentSelection === targetUserId) {
      lobby.currentVotes.delete(user.id);
      logInfo('vote_cleared', { userId: user.id, lobbyName: lobby.name });
      return ack({ ok: true, cleared: true });
    }
    lobby.currentVotes.set(user.id, targetUserId);
    logInfo('vote_cast', {
      userId: user.id,
      lobbyName: lobby.name,
      targetUserId,
    });
    return ack({ ok: true });
  });
};
