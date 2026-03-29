import { CLIENT_EVENTS } from '../../events.js';
import { buildGameInitPayloadForUser } from '../../../services/game/index.js';
import { requireAckAndLobby, requireLobbyMembership, requireTargetUserId } from '../shared.js';

/* =============================================================================
   Game Handlers: Init + Notebook Read
============================================================================= */

export const registerGameInitHandlers = ({ socket, user }) => {
  socket.on(CLIENT_EVENTS.GAME_INIT, (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    return ack({
      ok: true,
      game: {
        ...buildGameInitPayloadForUser({ lobby, userId: user.id }),
      },
    });
  });

  socket.on(CLIENT_EVENTS.GAME_GET_NOTEBOOK, (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'day' && lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not available in current phase' });
    }
    if (!lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Notebook can only be viewed for dead players' });
    }

    const member = lobby.members.get(targetUserId);
    return ack({
      ok: true,
      notebook: {
        userId: targetUserId,
        name: member?.name ?? 'Unknown Player',
        content: lobby.playerNotebooks?.get(targetUserId) ?? '',
      },
    });
  });
};

