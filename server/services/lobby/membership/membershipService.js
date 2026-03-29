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
  lobby.members.set(user.id, createMember(user, socket.id));

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

  socket.join(lobby.name);

  console.log(`connected ${socket.id} (${user?.email}) joined lobby ${lobby.name}`);

  emitLobbyUpdate(io, lobby);
  emitLobbiesList(io);
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
