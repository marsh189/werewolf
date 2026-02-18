import { getLobby, getUserLobby } from '../state.js';
import { getAck, parseLobbyName } from '../lobbyService.js';
import { parseTargetUserId } from '../validators.js';

export const requireAckAndLobby = (data, callback) => {
  const ack = getAck(callback);
  const name = parseLobbyName(data);
  if (!name) {
    ack({ ok: false, error: 'Invalid Lobby Name' });
    return { ack, name: null, lobby: null };
  }
  const lobby = getLobby(name);
  if (!lobby) {
    ack({ ok: false, error: 'Lobby does not exist' });
    return { ack, name, lobby: null };
  }
  return { ack, name, lobby };
};

export const requireLobbyMembership = (lobby, userId, ack) => {
  if (!lobby.members.has(userId)) {
    ack({ ok: false, error: 'User has not joined this lobby' });
    return false;
  }
  return true;
};

export const requireHost = (lobby, userId) => lobby.hostUserId === userId;

export const requireSameCurrentLobby = (userId, lobbyName, ack) => {
  const current = getUserLobby(userId);
  if (!current || current !== lobbyName) {
    ack({ ok: false, error: 'User has not joined this lobby' });
    return false;
  }
  return true;
};

export const requireTargetUserId = (data, ack) => {
  const targetUserId = parseTargetUserId(data);
  if (!targetUserId) {
    ack({ ok: false, error: 'Invalid target user' });
    return null;
  }
  return targetUserId;
};
