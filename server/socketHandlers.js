import { lobbies, userToLobby } from './state.js';
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
} from './lobbyService.js';

export const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log('connected:', socket.id, 'user:', user);

    socket.on('joinLobby', (data, callback) => {
      const ack = getAck(callback);
      const name = parseLobbyName(data);
      if (!name) {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });
      if (lobby.started) {
        return ack({ ok: false, error: 'Game already started' });
      }

      const current = userToLobby.get(user.id);
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

      const lobbyExists = io.sockets.adapter.rooms.has(name);
      if (lobbyExists) {
        return ack({ ok: false, error: 'Lobby Name Already Exists' });
      }

      const lobby = createLobby(name, user);
      joinLobby(io, socket, lobby);
      return ack({ ok: true, lobbyName: name });
    });

    socket.on('initiateLobby', (data, callback) => {
      const ack = getAck(callback);
      const name = parseLobbyName(data);
      if (!name) {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const lobby = lobbies.get(name);
      if (!lobby || !lobby.members.has(user.id)) {
        return ack({ ok: false, error: 'Invalid lobby name' });
      }

      return ack({ ok: true, lobbyInfo: buildLobbyInfo(lobby) });
    });

    socket.on('lobby:verify', (data, callback) => {
      const ack = getAck(callback);
      const name = parseLobbyName(data);
      if (!name) {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const lobbyExists = io.sockets.adapter.rooms.has(name);
      if (!lobbyExists) {
        return ack({ ok: false, error: 'Lobby Does Not Exist' });
      }

      const current = userToLobby.get(user.id);
      if (!current || current !== name) {
        return ack({ ok: false, error: 'User has not joined this lobby' });
      }

      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby metadata missing' });

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
      const ack = getAck(callback);
      const name = parseLobbyName(data);
      if (!name) {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });
      if (lobby.hostUserId !== user.id) {
        return ack({ ok: false, error: 'Only host can start the game' });
      }
      if (lobby.started) {
        return ack({ ok: false, error: 'Game already started' });
      }

      const startingAt = scheduleGameStart(io, lobby);
      return ack({ ok: true, startingAt });
    });

    socket.on('game:init', (data, callback) => {
      const ack = getAck(callback);
      const name = parseLobbyName(data);
      if (!name) {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });
      if (!lobby.members.has(user.id)) {
        return ack({ ok: false, error: 'User has not joined this lobby' });
      }

      return ack({
        ok: true,
        game: {
          started: lobby.started,
          phase: lobby.gamePhase ?? 'lobby',
          phaseEndsAt: lobby.phaseEndsAt ?? null,
          role: lobby.playerRoles.get(user.id) ?? null,
          hostUserId: lobby.hostUserId,
        },
      });
    });

    socket.on('endGame', (data, callback) => {
      const ack = getAck(callback);
      const name = parseLobbyName(data);
      if (!name) {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });
      if (!lobby.members.has(user.id)) {
        return ack({ ok: false, error: 'User has not joined this lobby' });
      }
      if (lobby.hostUserId !== user.id) {
        return ack({ ok: false, error: 'Only host can end the game' });
      }

      endGameForLobby(io, lobby);
      return ack({ ok: true });
    });

    socket.on('lobby:updateSettings', (data, callback) => {
      const ack = getAck(callback);
      const { lobbyName, werewolfCount, extraRoles, phaseDurations } =
        data ?? {};
      if (!lobbyName || typeof lobbyName !== 'string') {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }

      const name = lobbyName.trim();
      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });
      if (lobby.hostUserId !== user.id) {
        return ack({ ok: false, error: 'Only host can update settings' });
      }

      const count = Math.max(1, Number(werewolfCount) || 1);
      const roles = Array.isArray(extraRoles)
        ? extraRoles.filter((r) => typeof r === 'string')
        : [];
      const uniqueRoles = Array.from(new Set(roles));

      lobby.werewolfCount = count;
      lobby.extraRoles = uniqueRoles;
      if (phaseDurations && typeof phaseDurations === 'object') {
        const daySeconds = Math.max(60, Number(phaseDurations.daySeconds) || 60);
        const nightSeconds = Math.max(
          60,
          Number(phaseDurations.nightSeconds) || 60,
        );
        const voteSeconds = Math.max(1, Number(phaseDurations.voteSeconds) || 30);
        lobby.phaseDurations = { daySeconds, nightSeconds, voteSeconds };
      }

      emitLobbyUpdate(io, lobby);
      return ack({ ok: true });
    });

    socket.on('disconnect', () => {
      const lobbyName = userToLobby.get(user.id);
      if (!lobbyName) return;
      leaveLobby(io, socket, lobbyName);
    });
  });
};
