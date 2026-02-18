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
      const myRole = lobby.playerRoles.get(user.id) ?? null;
      const werewolfUserIds =
        myRole === 'Werewolf'
          ? Array.from(lobby.playerRoles.entries())
              .filter(([, role]) => role === 'Werewolf')
              .map(([userId]) => userId)
          : [];

      return ack({
        ok: true,
        game: {
          started: lobby.started,
          phase: lobby.gamePhase ?? 'lobby',
          dayNumber: lobby.dayNumber ?? null,
          nightNumber: lobby.nightNumber ?? null,
          phaseEndsAt: lobby.phaseEndsAt ?? null,
          currentNightDeathReveal: lobby.currentNightDeathReveal ?? null,
          currentEliminationResult: lobby.currentEliminationResult ?? null,
          role: myRole,
          werewolfUserIds,
          hostUserId: lobby.hostUserId,
          canWriteNotebook: !lobby.eliminatedUserIds?.has(user.id),
        },
      });
    });

    socket.on('game:getNotebook', (data, callback) => {
      const ack = getAck(callback);
      const { lobbyName, targetUserId } = data ?? {};
      if (!lobbyName || typeof lobbyName !== 'string') {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }
      if (!targetUserId || typeof targetUserId !== 'string') {
        return ack({ ok: false, error: 'Invalid target user' });
      }

      const name = lobbyName.trim();
      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });
      if (!lobby.members.has(user.id)) {
        return ack({ ok: false, error: 'User has not joined this lobby' });
      }
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

    socket.on('game:nightKill', (data, callback) => {
      const ack = getAck(callback);
      const { lobbyName, targetUserId } = data ?? {};
      if (!lobbyName || typeof lobbyName !== 'string') {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }
      if (!targetUserId || typeof targetUserId !== 'string') {
        return ack({ ok: false, error: 'Invalid target user' });
      }

      const name = lobbyName.trim();
      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });
      if (lobby.gamePhase !== 'night') {
        return ack({ ok: false, error: 'Not in night phase' });
      }
      if (!lobby.members.has(user.id)) {
        return ack({ ok: false, error: 'User has not joined this lobby' });
      }
      if (lobby.eliminatedUserIds?.has(user.id)) {
        return ack({ ok: false, error: 'Dead players cannot act' });
      }
      const myRole = lobby.playerRoles.get(user.id);
      if (myRole !== 'Werewolf') {
        return ack({ ok: false, error: 'Only werewolves can kill at night' });
      }
      if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
        return ack({ ok: false, error: 'Target must be alive and in lobby' });
      }

      lobby.pendingNightKillTargetId = targetUserId;
      emitLobbyUpdate(io, lobby);
      return ack({ ok: true });
    });

    socket.on('game:castVote', (data, callback) => {
      const ack = getAck(callback);
      const { lobbyName, targetUserId } = data ?? {};
      if (!lobbyName || typeof lobbyName !== 'string') {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }
      if (!targetUserId || typeof targetUserId !== 'string') {
        return ack({ ok: false, error: 'Invalid target user' });
      }

      const name = lobbyName.trim();
      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });
      if (lobby.gamePhase !== 'vote') {
        return ack({ ok: false, error: 'Not in voting phase' });
      }
      if (!lobby.members.has(user.id)) {
        return ack({ ok: false, error: 'User has not joined this lobby' });
      }
      if (lobby.eliminatedUserIds?.has(user.id)) {
        return ack({ ok: false, error: 'Dead players cannot vote' });
      }
      if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
        return ack({ ok: false, error: 'Votes can only target alive players' });
      }

      if (!lobby.currentVotes) {
        lobby.currentVotes = new Map();
      }
      lobby.currentVotes.set(user.id, targetUserId);
      return ack({ ok: true });
    });

    socket.on('game:updateNotebook', (data, callback) => {
      const ack = getAck(callback);
      const { lobbyName, notes } = data ?? {};
      if (!lobbyName || typeof lobbyName !== 'string') {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }
      if (typeof notes !== 'string') {
        return ack({ ok: false, error: 'Invalid notes' });
      }

      const name = lobbyName.trim();
      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });
      if (!lobby.members.has(user.id)) {
        return ack({ ok: false, error: 'User has not joined this lobby' });
      }

      if (!lobby.playerNotebooks) {
        lobby.playerNotebooks = new Map();
      }
      lobby.playerNotebooks.set(user.id, notes.slice(0, 5000));
      return ack({ ok: true });
    });

    socket.on('game:setPlayerEliminated', (data, callback) => {
      const ack = getAck(callback);
      const { lobbyName, targetUserId, eliminated, cause } = data ?? {};

      if (!lobbyName || typeof lobbyName !== 'string') {
        return ack({ ok: false, error: 'Invalid Lobby Name' });
      }
      if (!targetUserId || typeof targetUserId !== 'string') {
        return ack({ ok: false, error: 'Invalid target user' });
      }

      const name = lobbyName.trim();
      const lobby = lobbies.get(name);
      if (!lobby) return ack({ ok: false, error: 'Lobby does not exist' });
      if (lobby.hostUserId !== user.id) {
        return ack({ ok: false, error: 'Only host can update player status' });
      }
      if (!lobby.members.has(targetUserId)) {
        return ack({ ok: false, error: 'Target user is not in this lobby' });
      }

      if (!lobby.eliminatedUserIds) {
        lobby.eliminatedUserIds = new Set();
      }
      if (!lobby.pendingNightDeathReveals) {
        lobby.pendingNightDeathReveals = [];
      }
      if (!lobby.playerNotebooks) {
        lobby.playerNotebooks = new Map();
      }

      if (eliminated === false) {
        lobby.eliminatedUserIds.delete(targetUserId);
        if (cause === 'night') {
          lobby.pendingNightDeathReveals = lobby.pendingNightDeathReveals.filter(
            (entry) => entry.userId !== targetUserId,
          );
        }
      } else {
        lobby.eliminatedUserIds.add(targetUserId);
        if (cause === 'night') {
          const member = lobby.members.get(targetUserId);
          const existingIndex = lobby.pendingNightDeathReveals.findIndex(
            (entry) => entry.userId === targetUserId,
          );
          const revealEntry = {
            userId: targetUserId,
            name: member?.name ?? 'Unknown Player',
            notebook: lobby.playerNotebooks.get(targetUserId) ?? '',
          };
          if (existingIndex >= 0) {
            lobby.pendingNightDeathReveals[existingIndex] = revealEntry;
          } else {
            lobby.pendingNightDeathReveals.push(revealEntry);
          }
        }
      }

      emitLobbyUpdate(io, lobby);
      return ack({ ok: true });
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
        const daySeconds = Math.max(10, Number(phaseDurations.daySeconds) || 10);
        const nightSeconds = Math.max(
          10,
          Number(phaseDurations.nightSeconds) || 10,
        );
        const voteSeconds = Math.max(10, Number(phaseDurations.voteSeconds) || 10);
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
