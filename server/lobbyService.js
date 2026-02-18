import {
  DEFAULT_PHASE_DURATIONS,
  ROLE_REVEAL_TOTAL_MS,
  START_COUNTDOWN_MS,
} from './constants.js';
import { lobbies, userToLobby } from './state.js';

export const createLobby = (name, hostUser) => {
  return {
    name,
    hostUserId: hostUser.id,
    createdAt: Date.now(),
    started: false,
    startingAt: null,
    startTimeoutId: null,
    werewolfCount: 1,
    extraRoles: [],
    phaseDurations: { ...DEFAULT_PHASE_DURATIONS },
    gamePhase: 'lobby',
    phaseEndsAt: null,
    playerRoles: new Map(),
    revealTimeoutId: null,
    members: new Map(),
  };
};

export const buildLobbyInfo = (lobby) => {
  return {
    lobbyName: lobby.name,
    hostUserId: lobby.hostUserId,
    members: Array.from(lobby.members.values()).map((m) => ({
      userId: m.userId,
      name: m.name,
    })),
    started: lobby.started,
    startingAt: lobby.startingAt,
    werewolfCount: lobby.werewolfCount ?? 1,
    extraRoles: Array.isArray(lobby.extraRoles) ? lobby.extraRoles : [],
    phaseDurations: lobby.phaseDurations ?? { ...DEFAULT_PHASE_DURATIONS },
    gamePhase: lobby.gamePhase ?? 'lobby',
    phaseEndsAt: lobby.phaseEndsAt ?? null,
  };
};

const publicLobbyView = ([lobbyName, lobby]) => {
  return {
    lobbyName,
    hostUserId: lobby.hostUserId,
    memberCount: lobby.members.size,
    started: lobby.started,
  };
};

export const getLobbies = () => {
  return [...lobbies.entries()]
    .map(publicLobbyView)
    .sort((a, b) => b.memberCount - a.memberCount);
};

export const createMember = (user, socketId) => {
  return {
    userId: user.id,
    name: user.name ?? 'Player',
    socketId: socketId,
    joinedAt: Date.now(),
  };
};

export const getAck = (callback) =>
  typeof callback === 'function' ? callback : () => {};

export const parseLobbyName = (data) => {
  const { lobbyName } = data ?? {};
  if (!lobbyName || typeof lobbyName !== 'string') return null;
  const name = lobbyName.trim();
  return name || null;
};

export const clearLobbyTimeouts = (lobby) => {
  if (lobby.startTimeoutId) {
    clearTimeout(lobby.startTimeoutId);
    lobby.startTimeoutId = null;
  }
  if (lobby.revealTimeoutId) {
    clearTimeout(lobby.revealTimeoutId);
    lobby.revealTimeoutId = null;
  }
};

export const emitLobbyUpdate = (io, lobby) => {
  io.to(lobby.name).emit('update', buildLobbyInfo(lobby));
};

export const emitLobbiesList = (io) => {
  io.emit('lobbiesList', getLobbies());
};

const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const buildRoleDeck = (memberCount, werewolfCount, extraRoles) => {
  if (memberCount <= 0) return [];

  const maxWerewolves = memberCount === 1 ? 1 : memberCount - 1;
  const safeWerewolfCount = Math.max(
    1,
    Math.min(maxWerewolves, Number(werewolfCount) || 1),
  );

  const normalizedExtraRoles = Array.isArray(extraRoles)
    ? extraRoles.filter(
        (role) =>
          typeof role === 'string' &&
          role.trim() &&
          role !== 'Werewolf' &&
          role !== 'Villager',
      )
    : [];

  const availableSpecialSlots = Math.max(0, memberCount - safeWerewolfCount);
  const specialRoles = normalizedExtraRoles.slice(0, availableSpecialSlots);
  const villagerCount = memberCount - safeWerewolfCount - specialRoles.length;

  return [
    ...Array.from({ length: safeWerewolfCount }, () => 'Werewolf'),
    ...specialRoles,
    ...Array.from({ length: villagerCount }, () => 'Villager'),
  ];
};

export const assignRolesToLobby = (lobby) => {
  const members = Array.from(lobby.members.values());
  const deck = shuffle(
    buildRoleDeck(members.length, lobby.werewolfCount, lobby.extraRoles),
  );
  const shuffledMembers = shuffle(members);
  const nextRoles = new Map();

  for (let i = 0; i < shuffledMembers.length; i++) {
    nextRoles.set(shuffledMembers[i].userId, deck[i] ?? 'Villager');
  }

  lobby.playerRoles = nextRoles;
};

export const scheduleGameStart = (io, lobby) => {
  const startingAt = Date.now() + START_COUNTDOWN_MS;
  lobby.startingAt = startingAt;

  if (lobby.startTimeoutId) clearTimeout(lobby.startTimeoutId);

  lobby.startTimeoutId = setTimeout(() => {
    assignRolesToLobby(lobby);
    lobby.started = true;
    lobby.startingAt = null;
    lobby.gamePhase = 'roleReveal';
    lobby.phaseEndsAt = Date.now() + ROLE_REVEAL_TOTAL_MS;

    if (lobby.revealTimeoutId) clearTimeout(lobby.revealTimeoutId);

    lobby.revealTimeoutId = setTimeout(() => {
      lobby.gamePhase = 'day';
      lobby.phaseEndsAt = null;
      emitLobbyUpdate(io, lobby);
    }, ROLE_REVEAL_TOTAL_MS);

    emitLobbyUpdate(io, lobby);
    emitLobbiesList(io);
  }, START_COUNTDOWN_MS);

  emitLobbyUpdate(io, lobby);
  emitLobbiesList(io);

  return startingAt;
};

export const endGameForLobby = (io, lobby) => {
  clearLobbyTimeouts(lobby);

  lobby.started = false;
  lobby.startingAt = null;
  lobby.gamePhase = 'lobby';
  lobby.phaseEndsAt = null;
  lobby.playerRoles = new Map();

  emitLobbyUpdate(io, lobby);
  emitLobbiesList(io);
};

export const leaveLobby = (io, socket, lobbyName) => {
  const user = socket.data.user;
  if (!lobbyName) return;

  const lobby = lobbies.get(lobbyName);
  if (!lobby) return;

  socket.leave(lobby.name);
  lobby.members.delete(user.id);
  userToLobby.delete(user.id);

  if (lobby.members.size === 0) {
    clearLobbyTimeouts(lobby);
    lobbies.delete(lobbyName);
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
  lobbies.set(lobby.name, lobby);
  userToLobby.set(user.id, lobby.name);

  socket.join(lobby.name);

  console.log(`connected ${socket.id} (${user?.email}) joined lobby ${lobby.name}`);

  emitLobbyUpdate(io, lobby);
  emitLobbiesList(io);
};
