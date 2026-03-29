import { getLobby, getUserLobby } from '../../state/state.js';
import { parseTargetUserId } from '../../validation/validators.js';
import { getAck, parseLobbyName } from '../utils.js';

/* =============================================================================
   Handler Guards (Shared)

   Small validation helpers used by socket event handlers to keep them:
   - consistent (same error messages)
   - compact (less repeated boilerplate)
============================================================================= */

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

/* -----------------------------------------------------------------------------
   Game / Phase Guards
----------------------------------------------------------------------------- */

export const requireGamePhase = (lobby, phase, ack, error) => {
  if (lobby.gamePhase !== phase) {
    ack({ ok: false, error });
    return false;
  }
  return true;
};

export const requireAliveActor = (
  lobby,
  userId,
  ack,
  error = 'Dead players cannot act',
) => {
  if (lobby.eliminatedUserIds?.has(userId)) {
    ack({ ok: false, error });
    return false;
  }
  return true;
};

export const requireAliveTargetMember = (
  lobby,
  targetUserId,
  ack,
  error = 'Target must be alive and in lobby',
) => {
  if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
    ack({ ok: false, error });
    return false;
  }
  return true;
};
