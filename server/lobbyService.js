import {
  DAY_ZERO_DURATION_MS,
  DEFAULT_PHASE_DURATIONS,
  ELIMINATION_RESULTS_DURATION_MS,
  NIGHT_DEATH_REVEAL_DURATION_MS,
  ROLE_REVEAL_TOTAL_MS,
  START_COUNTDOWN_MS,
} from './constants.js';
import {
  getLobby,
  deleteLobby,
  deleteUserLobby,
  getLobbyEntries,
  setLobby,
  setUserLobby,
} from './state.js';
import { parseLobbyNameInput } from './validators.js';

const clearRoundState = (lobby) => {
  lobby.dayNumber = null;
  lobby.nightNumber = null;
  lobby.phaseEndsAt = null;
  lobby.currentNightDeathReveal = null;
  lobby.pendingNightDeathReveals = [];
  lobby.pendingNightKillTargetId = null;
  lobby.currentVotes = new Map();
  lobby.currentEliminationResult = null;
};

const clearPlayerGameData = (lobby) => {
  lobby.playerRoles = new Map();
  lobby.playerNotebooks = new Map();
  lobby.eliminatedUserIds = new Set();
};

export const resetGameState = (lobby, { resetPlayers = true } = {}) => {
  clearRoundState(lobby);
  if (resetPlayers) {
    clearPlayerGameData(lobby);
  }
};

export const createLobby = (name, hostUser) => {
  const lobby = {
    name,
    hostUserId: hostUser.id,
    createdAt: Date.now(),
    started: false,
    startingAt: null,
    startTimeoutId: null,
    werewolfCount: 1,
    specialRolesEnabled: false,
    neutralRolesEnabled: false,
    phaseDurations: { ...DEFAULT_PHASE_DURATIONS },
    gamePhase: 'lobby',
    revealTimeoutId: null,
    phaseTimeoutId: null,
    members: new Map(),
  };
  resetGameState(lobby, { resetPlayers: true });
  return lobby;
};

export const buildLobbyInfo = (lobby) => {
  return {
    lobbyName: lobby.name,
    hostUserId: lobby.hostUserId,
    members: Array.from(lobby.members.values()).map((m) => ({
      userId: m.userId,
      name: m.name,
      alive: !lobby.eliminatedUserIds?.has(m.userId),
    })),
    started: lobby.started,
    startingAt: lobby.startingAt,
    werewolfCount: lobby.werewolfCount ?? 1,
    specialRolesEnabled: lobby.specialRolesEnabled === true,
    neutralRolesEnabled: lobby.neutralRolesEnabled === true,
    phaseDurations: lobby.phaseDurations ?? { ...DEFAULT_PHASE_DURATIONS },
    gamePhase: lobby.gamePhase ?? 'lobby',
    dayNumber: lobby.dayNumber ?? null,
    nightNumber: lobby.nightNumber ?? null,
    phaseEndsAt: lobby.phaseEndsAt ?? null,
    currentNightDeathReveal: lobby.currentNightDeathReveal ?? null,
    currentEliminationResult: lobby.currentEliminationResult ?? null,
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
  return [...getLobbyEntries()]
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
  return parseLobbyNameInput(data);
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
  if (lobby.phaseTimeoutId) {
    clearTimeout(lobby.phaseTimeoutId);
    lobby.phaseTimeoutId = null;
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

const VILLAGE_SPECIAL_ROLES = [
  'Doctor',
  'Tracker',
  'Lookout',
  'Investigator',
  'Hunter',
  'Trapper',
  'Escort',
  'Sentinel',
];

const NEUTRAL_SPECIAL_ROLES = [
  'Jester',
  'Executioner',
];

const buildRoleDeck = (
  memberCount,
  werewolfCount,
  specialRolesEnabled,
  neutralRolesEnabled,
) => {
  if (memberCount <= 0) return [];

  const maxWerewolves = memberCount === 1 ? 1 : memberCount - 1;
  const safeWerewolfCount = Math.max(
    1,
    Math.min(maxWerewolves, Number(werewolfCount) || 1),
  );

  const normalizedExtraRoles = specialRolesEnabled
    ? [
        ...VILLAGE_SPECIAL_ROLES,
        ...(neutralRolesEnabled ? NEUTRAL_SPECIAL_ROLES : []),
      ]
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
    buildRoleDeck(
      members.length,
      lobby.werewolfCount,
      lobby.specialRolesEnabled === true,
      lobby.neutralRolesEnabled === true,
    ),
  );
  const shuffledMembers = shuffle(members);
  const nextRoles = new Map();

  for (let i = 0; i < shuffledMembers.length; i++) {
    nextRoles.set(shuffledMembers[i].userId, deck[i] ?? 'Villager');
  }

  lobby.playerRoles = nextRoles;
};

const schedulePhaseTransition = (io, lobby, durationMs, onComplete) => {
  if (lobby.phaseTimeoutId) clearTimeout(lobby.phaseTimeoutId);
  lobby.phaseEndsAt = Date.now() + durationMs;
  lobby.phaseTimeoutId = setTimeout(() => {
    lobby.phaseTimeoutId = null;
    onComplete();
  }, durationMs);
};

const startNightPhase = (io, lobby, nightNumber) => {
  lobby.gamePhase = 'night';
  lobby.nightNumber = nightNumber;
  lobby.currentNightDeathReveal = null;
  lobby.pendingNightDeathReveals = [];
  lobby.pendingNightKillTargetId = null;
  lobby.currentVotes = new Map();
  lobby.currentEliminationResult = null;
  schedulePhaseTransition(
    io,
    lobby,
    (lobby.phaseDurations?.nightSeconds ?? 10) * 1000,
    () => {
      const targetId = lobby.pendingNightKillTargetId;
      if (targetId && lobby.members.has(targetId) && !lobby.eliminatedUserIds.has(targetId)) {
        lobby.eliminatedUserIds.add(targetId);
        const member = lobby.members.get(targetId);
        lobby.pendingNightDeathReveals.push({
          userId: targetId,
          name: member?.name ?? 'Unknown Player',
          notebook: lobby.playerNotebooks?.get(targetId) ?? '',
        });
      }
      lobby.pendingNightKillTargetId = null;
      startNightResultsPhase(io, lobby);
    },
  );
  emitLobbyUpdate(io, lobby);
};

const startNightResultsPhase = (io, lobby) => {
  const reveals = Array.isArray(lobby.pendingNightDeathReveals)
    ? lobby.pendingNightDeathReveals
    : [];

  if (!reveals.length) {
    lobby.gamePhase = 'nightResults';
    lobby.currentNightDeathReveal = null;
    schedulePhaseTransition(io, lobby, NIGHT_DEATH_REVEAL_DURATION_MS, () => {
      startDayPhase(io, lobby, (lobby.dayNumber ?? 0) + 1);
    });
    emitLobbyUpdate(io, lobby);
    return;
  }

  let index = 0;
  const showNextReveal = () => {
    lobby.gamePhase = 'nightResults';
    lobby.currentNightDeathReveal = reveals[index] ?? null;
    schedulePhaseTransition(io, lobby, NIGHT_DEATH_REVEAL_DURATION_MS, () => {
      index += 1;
      if (index < reveals.length) {
        showNextReveal();
        return;
      }
      lobby.pendingNightDeathReveals = [];
      lobby.currentNightDeathReveal = null;
      startDayPhase(io, lobby, (lobby.dayNumber ?? 0) + 1);
    });
    emitLobbyUpdate(io, lobby);
  };

  showNextReveal();
};

const startEliminationResultsPhase = (io, lobby) => {
  lobby.gamePhase = 'eliminationResults';
  lobby.currentNightDeathReveal = null;
  schedulePhaseTransition(io, lobby, ELIMINATION_RESULTS_DURATION_MS, () => {
    lobby.currentEliminationResult = null;
    startNightPhase(io, lobby, (lobby.nightNumber ?? 0) + 1);
  });
  emitLobbyUpdate(io, lobby);
};

const startVotePhase = (io, lobby) => {
  lobby.gamePhase = 'vote';
  lobby.currentVotes = new Map();
  schedulePhaseTransition(
    io,
    lobby,
    (lobby.phaseDurations?.voteSeconds ?? 10) * 1000,
    () => {
      const tally = new Map();
      for (const targetId of lobby.currentVotes.values()) {
        tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
      }
      let topTargetId = null;
      let topVotes = 0;
      let tie = false;
      for (const [targetId, count] of tally.entries()) {
        if (count > topVotes) {
          topVotes = count;
          topTargetId = targetId;
          tie = false;
        } else if (count === topVotes) {
          tie = true;
        }
      }

      if (!tie && topTargetId && lobby.members.has(topTargetId) && !lobby.eliminatedUserIds.has(topTargetId)) {
        lobby.eliminatedUserIds.add(topTargetId);
        const member = lobby.members.get(topTargetId);
        lobby.currentEliminationResult = {
          userId: topTargetId,
          name: member?.name ?? 'Unknown Player',
          notebook: lobby.playerNotebooks?.get(topTargetId) ?? '',
          voteCount: topVotes,
          noElimination: false,
        };
      } else {
        lobby.currentEliminationResult = {
          noElimination: true,
        };
      }
      startEliminationResultsPhase(io, lobby);
    },
  );
  emitLobbyUpdate(io, lobby);
};

const startDayPhase = (io, lobby, dayNumber) => {
  lobby.gamePhase = 'day';
  lobby.dayNumber = dayNumber;
  const durationMs =
    dayNumber === 0
      ? DAY_ZERO_DURATION_MS
      : (lobby.phaseDurations?.daySeconds ?? 10) * 1000;
  schedulePhaseTransition(
    io,
    lobby,
    durationMs,
    () => {
      if (dayNumber === 0) {
        startNightPhase(io, lobby, 1);
      } else {
        startVotePhase(io, lobby);
      }
    },
  );
  emitLobbyUpdate(io, lobby);
};

export const scheduleGameStart = (io, lobby) => {
  const startingAt = Date.now() + START_COUNTDOWN_MS;
  lobby.startingAt = startingAt;
  clearRoundState(lobby);
  lobby.eliminatedUserIds = new Set();

  if (lobby.startTimeoutId) clearTimeout(lobby.startTimeoutId);

  lobby.startTimeoutId = setTimeout(() => {
    assignRolesToLobby(lobby);
    lobby.started = true;
    lobby.startingAt = null;
    lobby.gamePhase = 'roleReveal';
    lobby.phaseEndsAt = Date.now() + ROLE_REVEAL_TOTAL_MS;

    if (lobby.revealTimeoutId) clearTimeout(lobby.revealTimeoutId);

    lobby.revealTimeoutId = setTimeout(() => {
      startDayPhase(io, lobby, 0);
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
  resetGameState(lobby, { resetPlayers: true });

  emitLobbyUpdate(io, lobby);
  emitLobbiesList(io);
};

export const leaveLobby = (io, socket, lobbyName) => {
  const user = socket.data.user;
  if (!lobbyName) return;

  const lobby = getLobby(lobbyName);
  if (!lobby) return;

  socket.leave(lobby.name);
  lobby.members.delete(user.id);
  lobby.eliminatedUserIds?.delete(user.id);
  lobby.playerNotebooks?.delete(user.id);
  if (lobby.pendingNightKillTargetId === user.id) {
    lobby.pendingNightKillTargetId = null;
  }
  lobby.currentVotes?.delete(user.id);
  for (const [voterId, targetId] of lobby.currentVotes?.entries() ?? []) {
    if (targetId === user.id) {
      lobby.currentVotes.delete(voterId);
    }
  }
  lobby.pendingNightDeathReveals = (lobby.pendingNightDeathReveals ?? []).filter(
    (entry) => entry.userId !== user.id,
  );
  if (lobby.currentNightDeathReveal?.userId === user.id) {
    lobby.currentNightDeathReveal = null;
  }
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
  setLobby(lobby.name, lobby);
  setUserLobby(user.id, lobby.name);

  socket.join(lobby.name);

  console.log(`connected ${socket.id} (${user?.email}) joined lobby ${lobby.name}`);

  emitLobbyUpdate(io, lobby);
  emitLobbiesList(io);
};
