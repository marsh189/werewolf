import {
  deleteLobby,
  deleteUserLobby,
  getLobby,
  setLobby,
  setUserLobby,
} from '../../../state/state.js';
import { removeUserFromLobbyState } from '../../lobbyCleanupService.js';
import { emitLobbiesList, emitLobbyUpdate } from '../../lobbyEmitService.js';
import { clearLobbyTimeouts } from '../timing/timeoutService.js';
import { createMember } from '../state/factoryService.js';

/* =============================================================================
   Lobby Membership

   Adds/removes users from a lobby and keeps the state maps in sync:
   - lobby membership `lobby.members`
   - lobby lookup tables in `server/state/state.js`
============================================================================= */

export const leaveLobby = (io, socket, lobbyName) => {
  const user = socket.data.user;
  if (!lobbyName) return;

  const lobby = getLobby(lobbyName);
  if (!lobby) return;

  socket.leave(lobby.name);
  removeUserFromLobbyState(lobby, user.id);
  deleteUserLobby(user.id);

  if (lobby.members.size === 0) {
    clearLobbyTimeouts(lobby);
    deleteLobby(lobbyName);
  }

  if (
    lobby.hostUserId === user.id &&
    lobby.members.size > 0 &&
    lobby.members.values().next()
  ) {
    lobby.hostUserId = lobby.members.values().next().value.userId;
  }

  console.log(`connected ${socket.id} (${user?.email}) left lobby ${lobby.name}`);

  emitLobbiesList(io);
  emitLobbyUpdate(io, lobby);
};

export const joinLobby = (io, socket, lobby) => {
  const user = socket.data.user;

  /* -------------------------------------------------------------------------
     Idempotent Join

     In dev, React Strict Mode and reconnect logic can cause the client to emit
     "initiateLobby" more than once during navigation. That handler re-uses this
     helper, which previously produced noisy duplicate "joined lobby" logs.

     Joining is safe to call repeatedly, but we treat it as a no-op when:
     - the user is already a member
     - the socket is already in the lobby room
     - the member's socketId already matches
  ------------------------------------------------------------------------- */

  const existingMember = lobby.members.get(user.id) ?? null;
  const alreadyMember = !!existingMember;
  const alreadyInRoom = socket.rooms?.has(lobby.name) === true;
  const sameSocket = existingMember?.socketId === socket.id;

  if (alreadyMember) {
    // Preserve `joinedAt` across reconnects; update socketId/name as needed.
    lobby.members.set(user.id, {
      ...existingMember,
      socketId: socket.id,
      name: user.name ?? existingMember.name ?? 'Player',
    });
  } else {
    lobby.members.set(user.id, createMember(user, socket.id));
  }

  // If the user reconnects before cleanup triggers, cancel the cleanup timer.
  if (lobby.disconnectCleanupTimers?.has(user.id)) {
    clearTimeout(lobby.disconnectCleanupTimers.get(user.id));
    lobby.disconnectCleanupTimers.delete(user.id);
  }

  if (!lobby.inGameUserCounts) {
    lobby.inGameUserCounts = new Map();
  }

  setLobby(lobby.name, lobby);
  setUserLobby(user.id, lobby.name);

  if (!alreadyInRoom) {
    socket.join(lobby.name);
  }

  const didChangeJoinState = !alreadyMember || !alreadyInRoom || !sameSocket;

  if (didChangeJoinState) {
    console.log(
      `connected ${socket.id} (${user?.email}) joined lobby ${lobby.name}`,
    );

    emitLobbyUpdate(io, lobby);
    emitLobbiesList(io);
  }
};

export const removeUserFromLobby = (io, lobbyName, userId) => {
  if (!lobbyName || !userId) return false;

  const lobby = getLobby(lobbyName);
  if (!lobby) return false;

  removeUserFromLobbyState(lobby, userId);
  deleteUserLobby(userId);

  if (lobby.members.size === 0) {
    clearLobbyTimeouts(lobby);
    deleteLobby(lobbyName);
    emitLobbiesList(io);
    return true;
  }

  if (
    lobby.hostUserId === userId &&
    lobby.members.size > 0 &&
    lobby.members.values().next()
  ) {
    lobby.hostUserId = lobby.members.values().next().value.userId;
  }

  emitLobbiesList(io);
  emitLobbyUpdate(io, lobby);
  return true;
};
