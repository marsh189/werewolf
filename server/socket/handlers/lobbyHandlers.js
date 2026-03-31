import { getLobby, getUserLobby, hasLobby } from '../../state/state.js';
import {
  buildLobbyInfo,
  createLobby,
  emitLobbyUpdate,
  endGameForLobby,
  getLobbies,
  handleInGamePresenceDisconnect,
  joinLobby,
  leaveLobby,
  removeUserFromLobby,
  scheduleGameStart,
  setSocketViewPresence,
} from '../../services/index.js';
import { getAck, parseLobbyName } from '../utils.js';
import {
  parseLobbyNameInput,
  sanitizeNeutralRolesEnabled,
  sanitizePhaseDurations,
  sanitizeSpecialRolesEnabled,
  sanitizeWerewolfCount,
} from '../../validation/validators.js';
import {
  requireAckAndLobby,
  requireHost,
  requireSameCurrentLobby,
} from './shared.js';
import { CLIENT_EVENTS } from '../events.js';
import { logInfo, logWarn } from '../../logger.js';

export const registerLobbyHandlers = ({ io, socket, user }) => {
  /* =============================================================================
     Lobby Handlers

     Socket events for lobby lifecycle:
     - create/join/leave/start/end
     - settings updates
     - presence tracking (which screen the user is viewing)
  ============================================================================= */

  socket.on(CLIENT_EVENTS.JOIN_LOBBY, (data, callback) => {
    const { ack, name, lobby } = requireAckAndLobby(data, callback);
    if (!name || !lobby) return;
    if (lobby.started) {
      return ack({ ok: false, error: 'Game already started' });
    }

    const current = getUserLobby(user.id);
    if (current && current !== name) {
      logWarn('join_lobby_denied', {
        userId: user.id,
        lobbyName: name,
        reason: 'Already in another lobby',
      });
      return ack({ ok: false, error: 'Already in another lobby' });
    }

    joinLobby(io, socket, lobby);
    logInfo('join_lobby', { userId: user.id, lobbyName: name });
    return ack({ ok: true, lobbyName: name });
  });

  socket.on(CLIENT_EVENTS.CREATE_LOBBY, ({ lobbyName }, callback) => {
    const ack = getAck(callback);
    const name = parseLobbyNameInput({ lobbyName });

    if (!name) {
      logWarn('create_lobby_denied', {
        userId: user.id,
        reason: 'Invalid Lobby Name',
      });
      return ack({ ok: false, error: 'Invalid Lobby Name' });
    }

    const lobbyExists = io.sockets.adapter.rooms.has(name) || hasLobby(name);
    if (lobbyExists) {
      logWarn('create_lobby_denied', {
        userId: user.id,
        lobbyName: name,
        reason: 'Lobby Name Already Exists',
      });
      return ack({ ok: false, error: 'Lobby Name Already Exists' });
    }

    const lobby = createLobby(name, user);
    joinLobby(io, socket, lobby);
    logInfo('create_lobby', { userId: user.id, lobbyName: name });
    return ack({ ok: true, lobbyName: name });
  });

  socket.on(CLIENT_EVENTS.INITIATE_LOBBY, (data, callback) => {
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

  socket.on(CLIENT_EVENTS.LOBBY_VERIFY, (data, callback) => {
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

  /* ---------------------------------------------------------------------------
     Presence

     Clients call this when navigating between lobby/game/results. We track it to:
     - maintain a rough in-game presence counter
     - auto-reset ended games when nobody is viewing them anymore
  --------------------------------------------------------------------------- */

  socket.on(CLIENT_EVENTS.PRESENCE_SET_VIEW, (data, callback) => {
    const { ack, name, lobby } = requireAckAndLobby(data, callback);
    if (!name || !lobby) return;

    const { view } = data ?? {};
    if (view !== 'lobby' && view !== 'game' && view !== 'results') {
      return ack({ ok: false, error: 'Invalid view' });
    }

    const result = setSocketViewPresence({
      io,
      socket,
      userId: user.id,
      lobbyName: lobby.name,
      view,
    });
    if (!result.ok) return ack(result);
    return ack({ ok: true });
  });

  socket.on(CLIENT_EVENTS.LOBBIES_LIST, (_, callback) => {
    callback?.({ ok: true, lobbies: getLobbies() });
  });

  socket.on(CLIENT_EVENTS.LEAVE_LOBBY, (data) => {
    const name = parseLobbyName(data);
    if (!name) return;
    leaveLobby(io, socket, name);
  });

  socket.on(CLIENT_EVENTS.START_GAME, (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireHost(lobby, user.id)) {
      logWarn('start_game_denied', {
        userId: user.id,
        lobbyName: lobby.name,
        reason: 'Only host can start the game',
      });
      return ack({ ok: false, error: 'Only host can start the game' });
    }
    if (lobby.started) {
      logWarn('start_game_denied', {
        userId: user.id,
        lobbyName: lobby.name,
        reason: 'Game already started',
      });
      return ack({ ok: false, error: 'Game already started' });
    }

    const startingAt = scheduleGameStart(io, lobby);
    logInfo('start_game', { userId: user.id, lobbyName: lobby.name, startingAt });
    return ack({ ok: true, startingAt });
  });

  socket.on(CLIENT_EVENTS.END_GAME, (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!lobby.members.has(user.id)) {
      return ack({ ok: false, error: 'User has not joined this lobby' });
    }
    if (!requireHost(lobby, user.id)) {
      return ack({ ok: false, error: 'Only host can end the game' });
    }

    endGameForLobby(io, lobby);
    logInfo('end_game', { userId: user.id, lobbyName: lobby.name });
    return ack({ ok: true });
  });

  socket.on(CLIENT_EVENTS.LOBBY_UPDATE_SETTINGS, (data, callback) => {
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
    logInfo('lobby_update_settings', {
      userId: user.id,
      lobbyName: lobby.name,
      werewolfCount: lobby.werewolfCount,
      specialRolesEnabled: lobby.specialRolesEnabled === true,
      neutralRolesEnabled: lobby.neutralRolesEnabled === true,
      phaseDurations: lobby.phaseDurations ?? null,
    });
    return ack({ ok: true });
  });

  /* ---------------------------------------------------------------------------
     Disconnect

     Handle two separate concerns:
     1) Presence bookkeeping (in-game counts)
     2) Lobby cleanup (removing users after a grace period if the game hasn't started)
  --------------------------------------------------------------------------- */

  socket.on('disconnect', () => {
    handleInGamePresenceDisconnect({ io, socket, userId: user.id });

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
