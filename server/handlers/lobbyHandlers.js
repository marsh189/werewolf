import { getLobby, getUserLobby, hasLobby } from '../state.js';
import {
  buildLobbyInfo,
  createLobby,
  endGameForLobby,
  getAck,
  getLobbies,
  joinLobby,
  leaveLobby,
  parseLobbyName,
  scheduleGameStart,
  emitLobbyUpdate,
} from '../lobbyService.js';
import {
  sanitizeExtraRoles,
  sanitizePhaseDurations,
  sanitizeWerewolfCount,
} from '../validators.js';
import {
  requireAckAndLobby,
  requireHost,
  requireSameCurrentLobby,
} from './shared.js';

export const registerLobbyHandlers = ({ io, socket, user }) => {
  socket.on('joinLobby', (data, callback) => {
    const ack = getAck(callback);
    const name = parseLobbyName(data);
    if (!name) {
      return ack({ ok: false, error: 'Invalid Lobby Name' });
    }

    const lobby = getLobby(name);
    if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });
    if (lobby.started) {
      return ack({ ok: false, error: 'Game already started' });
    }

    const current = getUserLobby(user.id);
    if (current && current !== name) {
      return ack({ ok: false, error: 'Already in another lobby' });
    }

    joinLobby(io, socket, lobby);
    return ack({ ok: true, lobbyName: name });
  });

  socket.on('createLobby', ({ lobbyName }, callback) => {
    const ack = getAck(callback);
    const name = String(lobbyName ?? '').trim();

    if (!name) {
      return ack({ ok: false, error: 'Invalid Lobby Name' });
    }

    const lobbyExists = io.sockets.adapter.rooms.has(name) || hasLobby(name);
    if (lobbyExists) {
      return ack({ ok: false, error: 'Lobby Name Already Exists' });
    }

    const lobby = createLobby(name, user);
    joinLobby(io, socket, lobby);
    return ack({ ok: true, lobbyName: name });
  });

  socket.on('initiateLobby', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!lobby.members.has(user.id)) {
      return ack({ ok: false, error: 'Invalid lobby name' });
    }
    return ack({ ok: true, lobbyInfo: buildLobbyInfo(lobby) });
  });

  socket.on('lobby:verify', (data, callback) => {
    const { ack, name, lobby } = requireAckAndLobby(data, callback);
    if (!name || !lobby) return;
    if (!requireSameCurrentLobby(user.id, name, ack)) return;
    return ack({ ok: true, lobbyInfo: buildLobbyInfo(lobby) });
  });

  socket.on('lobbiesList', (_, callback) => {
    callback?.({ ok: true, lobbies: getLobbies() });
  });

  socket.on('leaveLobby', (data) => {
    const name = parseLobbyName(data);
    if (!name) return;
    leaveLobby(io, socket, name);
  });

  socket.on('startGame', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireHost(lobby, user.id)) {
      return ack({ ok: false, error: 'Only host can start the game' });
    }
    if (lobby.started) {
      return ack({ ok: false, error: 'Game already started' });
    }

    const startingAt = scheduleGameStart(io, lobby);
    return ack({ ok: true, startingAt });
  });

  socket.on('endGame', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!lobby.members.has(user.id)) {
      return ack({ ok: false, error: 'User has not joined this lobby' });
    }
    if (!requireHost(lobby, user.id)) {
      return ack({ ok: false, error: 'Only host can end the game' });
    }

    endGameForLobby(io, lobby);
    return ack({ ok: true });
  });

  socket.on('lobby:updateSettings', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireHost(lobby, user.id)) {
      return ack({ ok: false, error: 'Only host can update settings' });
    }

    const { werewolfCount, extraRoles, phaseDurations } = data ?? {};
    lobby.werewolfCount = sanitizeWerewolfCount(werewolfCount);
    lobby.extraRoles = sanitizeExtraRoles(extraRoles);
    const nextDurations = sanitizePhaseDurations(phaseDurations, 10);
    if (nextDurations) {
      lobby.phaseDurations = nextDurations;
    }

    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('disconnect', () => {
    const lobbyName = getUserLobby(user.id);
    if (!lobbyName) return;
    leaveLobby(io, socket, lobbyName);
  });
};
