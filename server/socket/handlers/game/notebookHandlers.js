import { CLIENT_EVENTS } from '../../events.js';
import { requireAckAndLobby, requireLobbyMembership } from '../shared.js';

/* =============================================================================
   Game Handlers: Notebook Write
============================================================================= */

export const registerNotebookHandlers = ({ socket, user }) => {
  socket.on(CLIENT_EVENTS.GAME_UPDATE_NOTEBOOK, (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const { notes } = data ?? {};
    if (typeof notes !== 'string') {
      return ack({ ok: false, error: 'Invalid notes' });
    }

    if (!lobby.playerNotebooks) {
      lobby.playerNotebooks = new Map();
    }
    lobby.playerNotebooks.set(user.id, notes.slice(0, 5000));
    return ack({ ok: true });
  });
};

