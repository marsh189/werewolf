import { getLobby, getUserLobby, hasLobby } from '../state.js';
import {
  buildLobbyInfo,
  createLobby,
  endGameForLobby,
  getAck,
  getLobbies,
  joinLobby,
  leaveLobby,
  removeUserFromLobby,
  parseLobbyName,
  scheduleGameStart,
  emitLobbyUpdate,
} from '../lobbyService.js';
import {
  parseLobbyNameInput,
  sanitizeNeutralRolesEnabled,
  sanitizePhaseDurations,
  sanitizeSpecialRolesEnabled,
  sanitizeWerewolfCount,
} from '../validators.js';
import {
  requireAckAndLobby,
  requireHost,
  requireSameCurrentLobby,
} from './shared.js';

export const registerLobbyHandlers = ({ io, socket, user }) => {
  const updateInGamePresence = (lobby, userId, delta) => {
    if (!lobby?.inGameUserCounts) {
      lobby.inGameUserCounts = new Map();
    }
    const next = Math.max(0, (lobby.inGameUserCounts.get(userId) ?? 0) + delta);
    if (next === 0) {
      lobby.inGameUserCounts.delete(userId);
    } else {
      lobby.inGameUserCounts.set(userId, next);
    }
  };

  const getTotalInGameCount = (lobby) =>
    Array.from(lobby?.inGameUserCounts?.values?.() ?? []).reduce(
      (sum, n) => sum + (Number(n) || 0),
      0,
    );

  const maybeAutoResetEndedGame = (lobby) => {
    if (!lobby) return;
    if (lobby.gamePhase !== 'gameResults') return;
    if (getTotalInGameCount(lobby) !== 0) return;
    endGameForLobby(io, lobby);
  };

  const setSocketViewPresence = (lobbyName, view) => {
    const lobby = getLobby(lobbyName);
    if (!lobby) return { ok: false, error: 'Lobby does not exist' };

    const current = getUserLobby(user.id) ?? null;
    const isMember = lobby.members.has(user.id);
    if (!isMember && current !== lobbyName) {
      return { ok: false, error: 'User has not joined this lobby' };
    }

    const previous = socket.data?.viewPresence ?? null;
    const previousLobbyName = previous?.lobbyName ?? null;
    const previousView = previous?.view ?? null;
    const wasInGame = previousView === 'game' || previousView === 'results';
    const nowInGame = view === 'game' || view === 'results';

    if (previousLobbyName && wasInGame) {
      const previousLobby = getLobby(previousLobbyName);
      if (previousLobby) {
        updateInGamePresence(previousLobby, user.id, -1);
        maybeAutoResetEndedGame(previousLobby);
      }
    }

    socket.data.viewPresence = { lobbyName, view };

    if (nowInGame) {
      updateInGamePresence(lobby, user.id, 1);
    }

    maybeAutoResetEndedGame(lobby);
    return { ok: true };
  };

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
    const name = parseLobbyNameInput({ lobbyName });

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

    const current = getUserLobby(user.id) ?? null;
    const isMember = lobby.members.has(user.id);
    if (!isMember && current !== lobby.name) {
      return ack({ ok: false, error: 'Invalid lobby name' });
    }

    // Reconnect-friendly: refresh membership + room join.
    joinLobby(io, socket, lobby);
    return ack({ ok: true, lobbyInfo: buildLobbyInfo(lobby) });
  });

  socket.on('lobby:verify', (data, callback) => {
    const { ack, name, lobby } = requireAckAndLobby(data, callback);
    if (!name || !lobby) return;

    const current = getUserLobby(user.id) ?? null;
    const isMember = lobby.members.has(user.id);

    // Reconnect-friendly: if the user is (or should be) in this lobby, re-join the socket room and refresh membership.
    if (isMember || current === name) {
      joinLobby(io, socket, lobby);
      return ack({ ok: true, lobbyInfo: buildLobbyInfo(lobby) });
    }

    if (!requireSameCurrentLobby(user.id, name, ack)) return;
    return ack({ ok: true, lobbyInfo: buildLobbyInfo(lobby) });
  });

  socket.on('presence:setView', (data, callback) => {
    const ack = getAck(callback);
    const name = parseLobbyName(data);
    if (!name) return ack({ ok: false, error: 'Invalid Lobby Name' });

    const { view } = data ?? {};
    if (view !== 'lobby' && view !== 'game' && view !== 'results') {
      return ack({ ok: false, error: 'Invalid view' });
    }

    const result = setSocketViewPresence(name, view);
    if (!result.ok) return ack(result);

    const lobby = getLobby(name);
    if (lobby) {
      emitLobbyUpdate(io, lobby);
    }
    return ack({ ok: true });
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

    const {
      werewolfCount,
      specialRolesEnabled,
      neutralRolesEnabled,
      phaseDurations,
    } = data ?? {};

    const nextSpecialRolesEnabled =
      typeof specialRolesEnabled === 'boolean'
        ? sanitizeSpecialRolesEnabled(specialRolesEnabled)
        : lobby.specialRolesEnabled === true;

    if (typeof specialRolesEnabled === 'boolean') {
      lobby.specialRolesEnabled = nextSpecialRolesEnabled;
    }

    const minWerewolves = nextSpecialRolesEnabled ? 2 : 1;
    lobby.werewolfCount = sanitizeWerewolfCount(
      werewolfCount ?? lobby.werewolfCount,
      minWerewolves,
    );

    if (typeof neutralRolesEnabled === 'boolean') {
      lobby.neutralRolesEnabled = sanitizeNeutralRolesEnabled(neutralRolesEnabled);
    }
    const nextDurations = sanitizePhaseDurations(phaseDurations, 10);
    if (nextDurations) {
      lobby.phaseDurations = nextDurations;
    }

    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('disconnect', () => {
    const previous = socket.data?.viewPresence ?? null;
    const previousLobbyName = previous?.lobbyName ?? null;
    const previousView = previous?.view ?? null;
    const wasInGame = previousView === 'game' || previousView === 'results';
    if (previousLobbyName && wasInGame) {
      const previousLobby = getLobby(previousLobbyName);
      if (previousLobby) {
        updateInGamePresence(previousLobby, user.id, -1);
        maybeAutoResetEndedGame(previousLobby);
      }
    }

    const lobbyName = getUserLobby(user.id);
    if (!lobbyName) return;
    const lobby = getLobby(lobbyName);
    if (!lobby) return;

    // Don't drop players on transient disconnects during countdown or in-game.
    if (lobby.started === true || lobby.startingAt) {
      const member = lobby.members.get(user.id);
      if (member) {
        member.socketId = null;
      }
      return;
    }

    const member = lobby.members.get(user.id);
    if (member) {
      member.socketId = null;
    }

    if (!lobby.disconnectCleanupTimers) {
      lobby.disconnectCleanupTimers = new Map();
    }
    const existing = lobby.disconnectCleanupTimers.get(user.id);
    if (existing) {
      clearTimeout(existing);
    }

    const timeoutId = setTimeout(() => {
      const currentLobbyName = getUserLobby(user.id) ?? null;
      const latestLobby = getLobby(lobbyName);
      if (!latestLobby) return;
      if (latestLobby.started === true || latestLobby.startingAt) return;
      if (currentLobbyName !== lobbyName) return;
      const latestMember = latestLobby.members.get(user.id);
      if (!latestMember) return;
      if (latestMember.socketId) return;
      removeUserFromLobby(io, lobbyName, user.id);
    }, 15_000);

    lobby.disconnectCleanupTimers.set(user.id, timeoutId);
  });
};
