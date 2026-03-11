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
import {
  addSystemChatMessage,
  addTargetedSystemChatMessage,
  emitChatMessage,
  resetLobbyChat,
  syncLobbyChatRooms,
} from './chatService.js';
import { parseLobbyNameInput } from './validators.js';

const NIGHT_ACTION_RESULTS_DURATION_MS = 5000;

const clearRoundState = (lobby) => {
  lobby.dayNumber = null;
  lobby.nightNumber = null;
  lobby.phaseEndsAt = null;
  lobby.currentNightDeathReveal = null;
  lobby.pendingNightDeathReveals = [];
  lobby.pendingWerewolfKillTargetId = null;
  lobby.pendingWerewolfKillActorUserId = null;
  lobby.pendingAlphaWolfKillTargetId = null;
  lobby.pendingHunterKillTargets = new Map();
  lobby.pendingTrapperAlertUserIds = new Set();
  lobby.pendingEscortVisitTargets = new Map();
  lobby.pendingBodyguardGuardTargets = new Map();
  lobby.pendingDoctorProtectTargets = new Map();
  lobby.pendingTrackerWatchTargets = new Map();
  lobby.pendingLookoutWatchTargets = new Map();
  lobby.pendingInvestigatorVisitTargets = new Map();
  lobby.pendingFramerTargets = new Map();
  lobby.pendingProwlerTargets = new Map();
  lobby.pendingSnatcherTargets = new Map();
  lobby.pendingCursedTargets = new Map();
  lobby.pendingMimicTargets = new Map();
  lobby.currentVotes = new Map();
  lobby.actionTimestamps = new Map();
  lobby.currentEliminationResult = null;
};

const clearPlayerGameData = (lobby) => {
  lobby.playerRoles = new Map();
  lobby.playerRoleState = new Map();
  lobby.playerNotebooks = new Map();
  lobby.eliminatedUserIds = new Set();
  lobby.publicEliminatedUserIds = new Set();
};

const createInitialRoleState = (role) => ({
  hunterShotsRemaining: role === 'Hunter' ? 3 : 0,
  trapperAlertsRemaining: role === 'Trapper' ? 3 : 0,
  doctorSelfProtectUsed: false,
  executionerTargetUserId: null,
});

export const resetGameState = (lobby, { resetPlayers = true } = {}) => {
  clearRoundState(lobby);
  resetLobbyChat(lobby);
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
      alive: !lobby.publicEliminatedUserIds?.has(m.userId),
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
  syncLobbyChatRooms(io, lobby);
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
  'Bodyguard',
];

const WEREWOLF_SPECIAL_ROLES = [
  'AlphaWolf',
  'Framer',
  'Prowler',
  'Cursed',
  'Snatcher',
  'Mimic',
];

const NEUTRAL_SPECIAL_ROLES = [
  'Jester',
  'Executioner',
];

const VILLAGE_ROLE_CATEGORY_BY_ROLE = {
  Doctor: 'Support',
  Tracker: 'Information',
  Lookout: 'Information',
  Investigator: 'Information',
  Hunter: 'Killing',
  Trapper: 'Control',
  Escort: 'Control',
  Bodyguard: 'Support',
};

const pickRandomItems = (items, count) => shuffle(items).slice(0, count);

const getVillageCategoryTargets = (slots) => {
  const targets = {
    Killing: 0,
    Information: 0,
    Support: 0,
    Control: 0,
  };

  if (slots <= 0) return targets;
  if (slots === 1) {
    targets.Information = 1;
    return targets;
  }
  if (slots === 2) {
    targets.Information = 1;
    targets.Support = 1;
    return targets;
  }
  if (slots === 3) {
    targets.Information = 1;
    targets.Support = 1;
    targets.Control = 1;
    return targets;
  }
  if (slots === 4) {
    targets.Killing = 1;
    targets.Information = 1;
    targets.Support = 1;
    targets.Control = 1;
    return targets;
  }

  targets.Killing = 1;
  targets.Information = 2;
  targets.Support = 1;
  targets.Control = 1;

  let remaining = slots - 5;
  const growthOrder = ['Support', 'Control', 'Information'];
  let index = 0;
  while (remaining > 0) {
    const category = growthOrder[index % growthOrder.length];
    targets[category] += 1;
    remaining -= 1;
    index += 1;
  }

  return targets;
};

const selectVillageSpecialRoles = (slots) => {
  if (slots <= 0) return [];

  const byCategory = {
    Killing: [],
    Information: [],
    Support: [],
    Control: [],
  };

  for (const role of VILLAGE_SPECIAL_ROLES) {
    const category = VILLAGE_ROLE_CATEGORY_BY_ROLE[role];
    if (category && byCategory[category]) {
      byCategory[category].push(role);
    }
  }

  const targets = getVillageCategoryTargets(slots);
  const selected = [];

  for (const category of Object.keys(byCategory)) {
    const needed = targets[category] ?? 0;
    if (needed <= 0) continue;
    selected.push(...pickRandomItems(byCategory[category], needed));
  }

  if (selected.length >= slots) {
    return selected.slice(0, slots);
  }

  const remainingPool = VILLAGE_SPECIAL_ROLES.filter(
    (role) => !selected.includes(role),
  );
  selected.push(...pickRandomItems(remainingPool, slots - selected.length));
  return selected;
};

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

  const availableSpecialSlots = Math.max(0, memberCount - safeWerewolfCount);
  let selectedNeutralRoles = [];
  if (specialRolesEnabled && neutralRolesEnabled && availableSpecialSlots > 0) {
    selectedNeutralRoles = pickRandomItems(NEUTRAL_SPECIAL_ROLES, 1);
  }
  const villageSpecialSlots = Math.max(
    0,
    availableSpecialSlots - selectedNeutralRoles.length,
  );
  const selectedVillageRoles = specialRolesEnabled
    ? selectVillageSpecialRoles(villageSpecialSlots)
    : [];
  const specialRoles = shuffle([...selectedVillageRoles, ...selectedNeutralRoles]);
  const villagerCount = memberCount - safeWerewolfCount - specialRoles.length;

  const werewolfRoles = specialRolesEnabled
    ? (() => {
        const pickedSpecials = pickRandomItems(
          WEREWOLF_SPECIAL_ROLES.filter((role) => role !== 'AlphaWolf'),
          Math.max(0, safeWerewolfCount - 1),
        );
        const roles = ['AlphaWolf', ...pickedSpecials];
        while (roles.length < safeWerewolfCount) {
          roles.push('Werewolf');
        }
        return roles.slice(0, safeWerewolfCount);
      })()
    : Array.from({ length: safeWerewolfCount }, () => 'Werewolf');

  return [
    ...werewolfRoles,
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
  const initialRoleState = new Map(
    Array.from(nextRoles.entries()).map(([userId, role]) => [
      userId,
      createInitialRoleState(role),
    ]),
  );
  const executionerIds = Array.from(nextRoles.entries())
    .filter(([, role]) => role === 'Executioner')
    .map(([userId]) => userId);
  for (const executionerUserId of executionerIds) {
    const candidateTargetIds = Array.from(nextRoles.entries())
      .filter(
        ([targetUserId, targetRole]) =>
          targetUserId !== executionerUserId &&
          targetRole !== 'Werewolf' &&
          targetRole !== 'AlphaWolf' &&
          targetRole !== 'Framer' &&
          targetRole !== 'Prowler' &&
          targetRole !== 'Cursed' &&
          targetRole !== 'Snatcher' &&
          targetRole !== 'Mimic' &&
          targetRole !== 'Executioner' &&
          targetRole !== 'Jester',
      )
      .map(([targetUserId]) => targetUserId);
    const selectedTargetUserId = candidateTargetIds.length
      ? shuffle(candidateTargetIds)[0]
      : null;
    const roleState = initialRoleState.get(executionerUserId) ?? {
      hunterShotsRemaining: 0,
      trapperAlertsRemaining: 0,
      executionerTargetUserId: null,
    };
    roleState.executionerTargetUserId = selectedTargetUserId;
    initialRoleState.set(executionerUserId, roleState);
  }
  lobby.playerRoleState = initialRoleState;
};

export const addNightDeathReveal = (lobby, userId) => {
  if (!lobby.members.has(userId) || lobby.eliminatedUserIds.has(userId)) return false;
  lobby.eliminatedUserIds.add(userId);
  const member = lobby.members.get(userId);
  lobby.pendingNightDeathReveals.push({
    userId,
    name: member?.name ?? 'Unknown Player',
    notebook: lobby.playerNotebooks?.get(userId) ?? '',
  });
  return true;
};

export const convertExecutionersToJesterForNightDeaths = (
  lobby,
  nightDeathUserIds,
) => {
  const nightDeaths = nightDeathUserIds instanceof Set
    ? nightDeathUserIds
    : new Set(nightDeathUserIds ?? []);
  for (const [userId, role] of lobby.playerRoles.entries()) {
    if (role !== 'Executioner') continue;
    if (lobby.eliminatedUserIds.has(userId)) continue;
    const roleState = lobby.playerRoleState?.get(userId);
    const targetUserId = roleState?.executionerTargetUserId ?? null;
    if (!targetUserId || !nightDeaths.has(targetUserId)) continue;
    lobby.playerRoles.set(userId, 'Jester');
    roleState.executionerTargetUserId = null;
    lobby.playerRoleState?.set(userId, roleState);
  }
};

const schedulePhaseTransition = (io, lobby, durationMs, onComplete) => {
  if (lobby.phaseTimeoutId) clearTimeout(lobby.phaseTimeoutId);
  lobby.phaseEndsAt = Date.now() + durationMs;
  lobby.phaseTimeoutId = setTimeout(() => {
    lobby.phaseTimeoutId = null;
    onComplete();
  }, durationMs);
};

const isVillageRole = (role) =>
  role !== 'Werewolf' &&
  role !== 'AlphaWolf' &&
  role !== 'Framer' &&
  role !== 'Prowler' &&
  role !== 'Cursed' &&
  role !== 'Snatcher' &&
  role !== 'Mimic' &&
  role !== 'Jester' &&
  role !== 'Executioner';

const getAliveWerewolfIds = (lobby, aliveAtNightStart) =>
  Array.from(lobby.playerRoles.entries())
    .filter(
      ([userId, role]) =>
        (role === 'Werewolf' ||
          role === 'AlphaWolf' ||
          role === 'Framer' ||
          role === 'Prowler' ||
          role === 'Cursed' ||
          role === 'Snatcher' ||
          role === 'Mimic') &&
        aliveAtNightStart.has(userId) &&
        !lobby.eliminatedUserIds.has(userId),
    )
    .map(([userId]) => userId);

const isWerewolfRole = (role) =>
  role === 'Werewolf' ||
  role === 'AlphaWolf' ||
  role === 'Framer' ||
  role === 'Prowler' ||
  role === 'Cursed' ||
  role === 'Snatcher' ||
  role === 'Mimic';

const hasNightAction = (role) =>
  role === 'Doctor' ||
  role === 'Werewolf' ||
  role === 'AlphaWolf' ||
  role === 'Hunter' ||
  role === 'Trapper' ||
  role === 'Escort' ||
  role === 'Bodyguard' ||
  role === 'Tracker' ||
  role === 'Lookout' ||
  role === 'Investigator' ||
  role === 'Framer' ||
  role === 'Prowler' ||
  role === 'Cursed' ||
  role === 'Snatcher' ||
  role === 'Mimic';

const formatNameList = (names) => {
  const cleaned = (Array.isArray(names) ? names : []).filter(Boolean);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
};

const getRoleDisplayName = (roleName) => {
  if (roleName === 'AlphaWolf') return 'Alpha Wolf';
  return roleName;
};

const articleFor = (word) => (/^[aeiou]/i.test(String(word ?? '').trim()) ? 'an' : 'a');

const formatChoiceList = (items) => {
  const cleaned = (Array.isArray(items) ? items : []).filter(Boolean);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} or ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')}, or ${cleaned[cleaned.length - 1]}`;
};

const INVESTIGATOR_RESULTS_BY_ROLE = {
  Villager: ['Villager', 'Doctor', 'Bodyguard'],
  Doctor: ['Villager', 'Doctor', 'Bodyguard'],
  Bodyguard: ['Villager', 'Doctor', 'Bodyguard'],

  Investigator: ['Investigator', 'Tracker', 'Lookout'],
  Tracker: ['Investigator', 'Tracker', 'Lookout'],
  Lookout: ['Investigator', 'Tracker', 'Lookout'],

  Escort: ['Escort', 'Trapper', 'Jester'],
  Trapper: ['Escort', 'Trapper', 'Jester'],
  Jester: ['Escort', 'Trapper', 'Jester'],

  Werewolf: ['Hunter', 'Executioner', 'Werewolf'],
  AlphaWolf: ['Hunter', 'Executioner', 'Werewolf'],
  Framer: ['Hunter', 'Executioner', 'Werewolf'],
  Prowler: ['Hunter', 'Executioner', 'Werewolf'],
  Cursed: ['Hunter', 'Executioner', 'Werewolf'],
  Snatcher: ['Hunter', 'Executioner', 'Werewolf'],
  Mimic: ['Hunter', 'Executioner', 'Werewolf'],
  Executioner: ['Hunter', 'Executioner', 'Werewolf'],
  Hunter: ['Hunter', 'Executioner', 'Werewolf'],
};

const findBodyguardGuardForTarget = (
  lobby,
  targetUserId,
  aliveAtNightStart,
  blockedByEscort,
) => {
  for (const [bodyguardUserId, guardedUserId] of (
    lobby.pendingBodyguardGuardTargets?.entries() ?? []
  )) {
    if (guardedUserId !== targetUserId) continue;
    if (!aliveAtNightStart.has(bodyguardUserId)) continue;
    if (!aliveAtNightStart.has(guardedUserId)) continue;
    if (blockedByEscort.has(bodyguardUserId)) continue;
    if (lobby.playerRoles.get(bodyguardUserId) !== 'Bodyguard') continue;
    return bodyguardUserId;
  }
  return null;
};

const getDoctorProtectedUserIds = (lobby, aliveAtNightStart, blockedByEscort) => {
  const protectedUserIds = new Set();
  for (const [doctorUserId, protectedUserId] of (
    lobby.pendingDoctorProtectTargets?.entries() ?? []
  )) {
    if (!aliveAtNightStart.has(doctorUserId)) continue;
    if (!aliveAtNightStart.has(protectedUserId)) continue;
    if (blockedByEscort.has(doctorUserId)) continue;
    if (lobby.playerRoles.get(doctorUserId) !== 'Doctor') continue;

    if (doctorUserId === protectedUserId) {
      const roleState = lobby.playerRoleState?.get(doctorUserId) ?? {};
      if (roleState.doctorSelfProtectUsed === true) continue;
      roleState.doctorSelfProtectUsed = true;
      lobby.playerRoleState?.set(doctorUserId, roleState);
    }

    protectedUserIds.add(protectedUserId);
  }
  return protectedUserIds;
};

const emitNightActionNotice = (
  io,
  lobby,
  recipientUserIds,
  content,
  audience = 'private',
  tone = 'death',
) => {
  if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) return;
  const message = addTargetedSystemChatMessage(lobby, {
    audience,
    content,
    recipientUserIds,
    tone,
  });
  emitChatMessage(io, lobby, message);
};

const startNightActionResultsPhase = (io, lobby) => {
  lobby.gamePhase = 'nightActionResults';
  lobby.currentNightDeathReveal = null;

  const reveals = Array.isArray(lobby.pendingNightDeathReveals)
    ? lobby.pendingNightDeathReveals
    : [];
  const killedUserIds = reveals.map((reveal) => reveal?.userId).filter(Boolean);
  if (killedUserIds.length > 0) {
    emitNightActionNotice(
      io,
      lobby,
      killedUserIds,
      'You were killed during the night.',
      'private',
      'death',
    );
  }

  schedulePhaseTransition(io, lobby, NIGHT_ACTION_RESULTS_DURATION_MS, () => {
    startNightResultsPhase(io, lobby);
  });
  emitLobbyUpdate(io, lobby);
};

const startNightPhase = (io, lobby, nightNumber) => {
  lobby.gamePhase = 'night';
  lobby.nightNumber = nightNumber;
  lobby.currentNightDeathReveal = null;
  lobby.pendingNightDeathReveals = [];
  lobby.pendingWerewolfKillTargetId = null;
  lobby.pendingWerewolfKillActorUserId = null;
  lobby.pendingAlphaWolfKillTargetId = null;
  lobby.pendingHunterKillTargets = new Map();
  lobby.pendingTrapperAlertUserIds = new Set();
  lobby.pendingEscortVisitTargets = new Map();
  lobby.pendingBodyguardGuardTargets = new Map();
  lobby.pendingDoctorProtectTargets = new Map();
  lobby.pendingTrackerWatchTargets = new Map();
  lobby.pendingLookoutWatchTargets = new Map();
  lobby.pendingInvestigatorVisitTargets = new Map();
  lobby.pendingFramerTargets = new Map();
  lobby.pendingProwlerTargets = new Map();
  lobby.pendingSnatcherTargets = new Map();
  lobby.pendingCursedTargets = new Map();
  lobby.pendingMimicTargets = new Map();
  lobby.currentVotes = new Map();
  lobby.currentEliminationResult = null;

  const aliveNow = new Set(
    Array.from(lobby.members.keys()).filter(
      (userId) => !lobby.eliminatedUserIds.has(userId),
    ),
  );
  const hasAliveAlpha = Array.from(lobby.playerRoles.entries()).some(
    ([userId, role]) =>
      role === 'AlphaWolf' && aliveNow.has(userId) && !lobby.eliminatedUserIds.has(userId),
  );
  if (!hasAliveAlpha) {
    const aliveWerewolfIds = Array.from(lobby.playerRoles.entries())
      .filter(
        ([userId, role]) =>
          isWerewolfRole(role) && aliveNow.has(userId) && !lobby.eliminatedUserIds.has(userId),
      )
      .map(([userId]) => userId);
    if (aliveWerewolfIds.length > 0) {
      const selectedUserId =
        aliveWerewolfIds[Math.floor(Math.random() * aliveWerewolfIds.length)];
      if (lobby.playerRoles.get(selectedUserId) !== 'AlphaWolf') {
        lobby.playerRoles.set(selectedUserId, 'AlphaWolf');
        const noticeContent = `${lobby.members.get(selectedUserId)?.name ?? 'A werewolf'} has been promoted to Alpha Wolf.`;
        emitNightActionNotice(
          io,
          lobby,
          aliveWerewolfIds,
          noticeContent,
          'werewolf',
          'default',
        );
      }
    }
  }

  const werewolfNotice = addSystemChatMessage(lobby, {
    audience: 'werewolf',
    content: 'Werewolves can now chat secretly to decide who to kill.',
  });
  emitChatMessage(io, lobby, werewolfNotice);

  const nonWerewolfUserIds = Array.from(lobby.members.keys()).filter((userId) => {
    if (lobby.eliminatedUserIds?.has(userId)) return false;
    return !isWerewolfRole(lobby.playerRoles?.get(userId));
  });
  if (nonWerewolfUserIds.length > 0) {
    const villageChatLockedNotice = addTargetedSystemChatMessage(lobby, {
      audience: 'private',
      recipientUserIds: nonWerewolfUserIds,
      content: 'Villagers cannot chat during the night.',
    });
    emitChatMessage(io, lobby, villageChatLockedNotice);
  }
  schedulePhaseTransition(
    io,
    lobby,
    (lobby.phaseDurations?.nightSeconds ?? 10) * 1000,
    () => {
      const aliveAtNightStart = new Set(
        Array.from(lobby.members.keys()).filter(
          (userId) => !lobby.eliminatedUserIds.has(userId),
        ),
      );
      const deaths = new Set();
      const blockedByEscort = new Set();
      const blockedBySnatcher = new Set();
      const attackedTargetIds = new Set();
      const trapperVisitedUserIds = new Set();
      const visitsByUserId = new Map();
      const visitorsByTargetUserId = new Map();
      const disguisedRoleByUserId = new Map();

      const addVisit = (visitorUserId, targetUserId) => {
        if (!visitorUserId || !targetUserId) return;
        visitsByUserId.set(visitorUserId, targetUserId);
        if (!visitorsByTargetUserId.has(targetUserId)) {
          visitorsByTargetUserId.set(targetUserId, new Set());
        }
        visitorsByTargetUserId.get(targetUserId).add(visitorUserId);
      };
      for (const [escortUserId, targetUserId] of (
        lobby.pendingEscortVisitTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(escortUserId)) continue;
        if (!aliveAtNightStart.has(targetUserId)) continue;
        if (lobby.playerRoles.get(escortUserId) === 'Escort') {
          addVisit(escortUserId, targetUserId);
        }
        const targetRole = lobby.playerRoles.get(targetUserId);
        if (!hasNightAction(targetRole)) continue;
        blockedByEscort.add(targetUserId);
      }

      for (const [snatcherUserId, targetUserId] of (
        lobby.pendingSnatcherTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(snatcherUserId)) continue;
        if (!aliveAtNightStart.has(targetUserId)) continue;
        if (blockedByEscort.has(snatcherUserId)) continue;
        if (lobby.playerRoles.get(snatcherUserId) !== 'Snatcher') continue;
        addVisit(snatcherUserId, targetUserId);
        const targetRole = lobby.playerRoles.get(targetUserId);
        if (!hasNightAction(targetRole)) continue;
        blockedBySnatcher.add(targetUserId);
      }
      const alertedTrappers = new Set(
        Array.from(lobby.pendingTrapperAlertUserIds ?? new Set()).filter(
          (userId) =>
            aliveAtNightStart.has(userId) &&
            !blockedByEscort.has(userId) &&
            !blockedBySnatcher.has(userId),
        ),
      );
      const doctorProtectedUserIds = getDoctorProtectedUserIds(
        lobby,
        aliveAtNightStart,
        new Set([...blockedByEscort, ...blockedBySnatcher]),
      );

      const cursedUserIds = new Set();
      for (const [cursedUserId, targetUserId] of (
        lobby.pendingCursedTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(cursedUserId)) continue;
        if (!aliveAtNightStart.has(targetUserId)) continue;
        if (blockedByEscort.has(cursedUserId)) continue;
        if (blockedBySnatcher.has(cursedUserId)) continue;
        if (lobby.playerRoles.get(cursedUserId) !== 'Cursed') continue;
        addVisit(cursedUserId, targetUserId);
        cursedUserIds.add(targetUserId);
      }

      for (const cursedUserId of cursedUserIds) {
        doctorProtectedUserIds.delete(cursedUserId);
      }

      const framedUserIds = new Set();
      for (const [framerUserId, targetUserId] of (
        lobby.pendingFramerTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(framerUserId)) continue;
        if (!aliveAtNightStart.has(targetUserId)) continue;
        if (blockedByEscort.has(framerUserId)) continue;
        if (blockedBySnatcher.has(framerUserId)) continue;
        if (lobby.playerRoles.get(framerUserId) !== 'Framer') continue;
        addVisit(framerUserId, targetUserId);
        framedUserIds.add(targetUserId);
      }

      for (const [mimicUserId, targetUserId] of (
        lobby.pendingMimicTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(mimicUserId)) continue;
        if (!aliveAtNightStart.has(targetUserId)) continue;
        if (blockedByEscort.has(mimicUserId)) continue;
        if (blockedBySnatcher.has(mimicUserId)) continue;
        if (lobby.playerRoles.get(mimicUserId) !== 'Mimic') continue;
        addVisit(mimicUserId, targetUserId);
        const copiedRole = lobby.playerRoles.get(targetUserId) ?? null;
        if (copiedRole) {
          disguisedRoleByUserId.set(mimicUserId, copiedRole);
        }
      }

      const werewolfTargetId = lobby.pendingWerewolfKillTargetId;
      const werewolfActorUserId = lobby.pendingWerewolfKillActorUserId;
      const alphaWolfTargetId = lobby.pendingAlphaWolfKillTargetId;
      const aliveWerewolfIds = getAliveWerewolfIds(lobby, aliveAtNightStart);

      const alphaWolfUserId = Array.from(lobby.playerRoles.entries()).find(
        ([userId, role]) =>
          role === 'AlphaWolf' &&
          aliveAtNightStart.has(userId) &&
          !lobby.eliminatedUserIds.has(userId),
      )?.[0] ?? null;

      const canAlphaKill =
        alphaWolfUserId &&
        alphaWolfTargetId &&
        !blockedByEscort.has(alphaWolfUserId) &&
        !blockedBySnatcher.has(alphaWolfUserId) &&
        aliveAtNightStart.has(alphaWolfUserId) &&
        aliveAtNightStart.has(alphaWolfTargetId) &&
        !lobby.eliminatedUserIds.has(alphaWolfUserId) &&
        lobby.playerRoles.get(alphaWolfUserId) === 'AlphaWolf';

      if (canAlphaKill) {
        addVisit(alphaWolfUserId, alphaWolfTargetId);
        attackedTargetIds.add(alphaWolfTargetId);
        if (alertedTrappers.has(alphaWolfTargetId)) {
          trapperVisitedUserIds.add(alphaWolfTargetId);
          if (aliveWerewolfIds.length > 0) {
            const randomWerewolfId =
              aliveWerewolfIds[Math.floor(Math.random() * aliveWerewolfIds.length)];
            deaths.add(randomWerewolfId);
          }
        } else if (!doctorProtectedUserIds.has(alphaWolfTargetId)) {
          const bodyguardGuardUserId = findBodyguardGuardForTarget(
            lobby,
            alphaWolfTargetId,
            aliveAtNightStart,
            new Set([...blockedByEscort, ...blockedBySnatcher]),
          );
          deaths.add(bodyguardGuardUserId ?? alphaWolfTargetId);
        }
      }

      if (
        !canAlphaKill &&
        werewolfTargetId &&
        werewolfActorUserId &&
        !blockedByEscort.has(werewolfActorUserId) &&
        !blockedBySnatcher.has(werewolfActorUserId) &&
        aliveAtNightStart.has(werewolfActorUserId) &&
        !lobby.eliminatedUserIds.has(werewolfActorUserId) &&
        lobby.playerRoles.get(werewolfActorUserId) === 'Werewolf' &&
        aliveAtNightStart.has(werewolfTargetId) &&
        alertedTrappers.has(werewolfTargetId)
      ) {
        addVisit(werewolfActorUserId, werewolfTargetId);
        attackedTargetIds.add(werewolfTargetId);
        trapperVisitedUserIds.add(werewolfTargetId);
        const aliveWerewolfIds = getAliveWerewolfIds(lobby, aliveAtNightStart);
        if (aliveWerewolfIds.length > 0) {
          const randomWerewolfId =
            aliveWerewolfIds[Math.floor(Math.random() * aliveWerewolfIds.length)];
          deaths.add(randomWerewolfId);
        }
      } else if (
        !canAlphaKill &&
        werewolfTargetId &&
        werewolfActorUserId &&
        !blockedByEscort.has(werewolfActorUserId) &&
        !blockedBySnatcher.has(werewolfActorUserId) &&
        aliveAtNightStart.has(werewolfActorUserId) &&
        !lobby.eliminatedUserIds.has(werewolfActorUserId) &&
        lobby.playerRoles.get(werewolfActorUserId) === 'Werewolf' &&
        aliveAtNightStart.has(werewolfTargetId)
      ) {
        addVisit(werewolfActorUserId, werewolfTargetId);
        attackedTargetIds.add(werewolfTargetId);
        if (alertedTrappers.has(werewolfTargetId)) {
          trapperVisitedUserIds.add(werewolfTargetId);
        }
        if (!doctorProtectedUserIds.has(werewolfTargetId)) {
          const bodyguardGuardUserId = findBodyguardGuardForTarget(
            lobby,
            werewolfTargetId,
            aliveAtNightStart,
            new Set([...blockedByEscort, ...blockedBySnatcher]),
          );
          deaths.add(bodyguardGuardUserId ?? werewolfTargetId);
        }
      }

      for (const [hunterUserId, targetUserId] of (
        lobby.pendingHunterKillTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(hunterUserId)) continue;
        if (blockedByEscort.has(hunterUserId)) continue;
        if (blockedBySnatcher.has(hunterUserId)) continue;
        if (!aliveAtNightStart.has(targetUserId)) continue;

        const roleState = lobby.playerRoleState?.get(hunterUserId);
        const shotsRemaining = roleState?.hunterShotsRemaining ?? 0;
        if (shotsRemaining <= 0) continue;

        addVisit(hunterUserId, targetUserId);
        roleState.hunterShotsRemaining = shotsRemaining - 1;
        lobby.playerRoleState?.set(hunterUserId, roleState);
        attackedTargetIds.add(targetUserId);
        if (alertedTrappers.has(targetUserId)) {
          trapperVisitedUserIds.add(targetUserId);
        }

        if (alertedTrappers.has(targetUserId)) {
          deaths.add(hunterUserId);
          continue;
        }

        if (!doctorProtectedUserIds.has(targetUserId)) {
          const bodyguardGuardUserId = findBodyguardGuardForTarget(
            lobby,
            targetUserId,
            aliveAtNightStart,
            new Set([...blockedByEscort, ...blockedBySnatcher]),
          );
          const resolvedVictimUserId = bodyguardGuardUserId ?? targetUserId;
          deaths.add(resolvedVictimUserId);
          const resolvedVictimRole = lobby.playerRoles.get(resolvedVictimUserId);
          if (isVillageRole(resolvedVictimRole)) {
            deaths.add(hunterUserId);
          }
        }
      }

      for (const [doctorUserId, protectedUserId] of (
        lobby.pendingDoctorProtectTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(doctorUserId)) continue;
        if (blockedByEscort.has(doctorUserId)) continue;
        if (blockedBySnatcher.has(doctorUserId)) continue;
        if (!aliveAtNightStart.has(protectedUserId)) continue;
        if (lobby.playerRoles.get(doctorUserId) !== 'Doctor') continue;
        if (doctorUserId !== protectedUserId) {
          addVisit(doctorUserId, protectedUserId);
        }
      }

      for (const [bodyguardUserId, guardedUserId] of (
        lobby.pendingBodyguardGuardTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(bodyguardUserId)) continue;
        if (blockedByEscort.has(bodyguardUserId)) continue;
        if (blockedBySnatcher.has(bodyguardUserId)) continue;
        if (!aliveAtNightStart.has(guardedUserId)) continue;
        if (lobby.playerRoles.get(bodyguardUserId) !== 'Bodyguard') continue;
        addVisit(bodyguardUserId, guardedUserId);
      }

      for (const [trackerUserId, trackedUserId] of (
        lobby.pendingTrackerWatchTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(trackerUserId)) continue;
        if (blockedByEscort.has(trackerUserId)) continue;
        if (blockedBySnatcher.has(trackerUserId)) continue;
        if (!aliveAtNightStart.has(trackedUserId)) continue;
        if (lobby.playerRoles.get(trackerUserId) !== 'Tracker') continue;
        addVisit(trackerUserId, trackedUserId);
      }

      for (const [lookoutUserId, watchedUserId] of (
        lobby.pendingLookoutWatchTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(lookoutUserId)) continue;
        if (blockedByEscort.has(lookoutUserId)) continue;
        if (blockedBySnatcher.has(lookoutUserId)) continue;
        if (!aliveAtNightStart.has(watchedUserId)) continue;
        if (lobby.playerRoles.get(lookoutUserId) !== 'Lookout') continue;
        addVisit(lookoutUserId, watchedUserId);
      }

      for (const [investigatorUserId, targetUserId] of (
        lobby.pendingInvestigatorVisitTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(investigatorUserId)) continue;
        if (blockedByEscort.has(investigatorUserId)) continue;
        if (blockedBySnatcher.has(investigatorUserId)) continue;
        if (!aliveAtNightStart.has(targetUserId)) continue;
        if (lobby.playerRoles.get(investigatorUserId) !== 'Investigator') continue;
        addVisit(investigatorUserId, targetUserId);
      }

      for (const [prowlerUserId, targetUserId] of (
        lobby.pendingProwlerTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(prowlerUserId)) continue;
        if (blockedByEscort.has(prowlerUserId)) continue;
        if (blockedBySnatcher.has(prowlerUserId)) continue;
        if (!aliveAtNightStart.has(targetUserId)) continue;
        if (lobby.playerRoles.get(prowlerUserId) !== 'Prowler') continue;
        addVisit(prowlerUserId, targetUserId);
      }

      for (const userId of deaths) {
        addNightDeathReveal(lobby, userId);
      }

      convertExecutionersToJesterForNightDeaths(lobby, deaths);

      if (aliveWerewolfIds.length > 0) {
        const killTargetId = alphaWolfTargetId ?? werewolfTargetId ?? null;
        if (killTargetId) {
          const targetName = lobby.members.get(killTargetId)?.name ?? 'Your target';
          if (!deaths.has(killTargetId)) {
            emitNightActionNotice(
              io,
              lobby,
              aliveWerewolfIds,
              `${targetName} survived the night.`,
              'werewolf',
            );
          }
        }
      }

      for (const [doctorUserId, protectedUserId] of (
        lobby.pendingDoctorProtectTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(doctorUserId)) continue;
        if (blockedByEscort.has(doctorUserId)) continue;
        if (blockedBySnatcher.has(doctorUserId)) continue;
        if (!attackedTargetIds.has(protectedUserId)) continue;
        const targetName = lobby.members.get(protectedUserId)?.name ?? 'Your target';
        emitNightActionNotice(
          io,
          lobby,
          [doctorUserId],
          `${targetName} was attacked during the night.`,
        );
      }

      for (const [bodyguardUserId, guardedUserId] of (
        lobby.pendingBodyguardGuardTargets?.entries() ?? []
      )) {
        if (!aliveAtNightStart.has(bodyguardUserId)) continue;
        if (blockedByEscort.has(bodyguardUserId)) continue;
        if (blockedBySnatcher.has(bodyguardUserId)) continue;
        if (!attackedTargetIds.has(guardedUserId)) continue;
        const targetName = lobby.members.get(guardedUserId)?.name ?? 'Your target';
        emitNightActionNotice(
          io,
          lobby,
          [bodyguardUserId],
          `${targetName} was attacked during the night.`,
        );
      }

      for (const trapperUserId of trapperVisitedUserIds) {
        emitNightActionNotice(
          io,
          lobby,
          [trapperUserId],
          'Someone visited you during the night.',
        );
      }

      const pendingTrackerResults = Array.from(
        lobby.pendingTrackerWatchTargets?.entries() ?? [],
      );
      const pendingLookoutResults = Array.from(
        lobby.pendingLookoutWatchTargets?.entries() ?? [],
      );
      const pendingInvestigatorResults = Array.from(
        lobby.pendingInvestigatorVisitTargets?.entries() ?? [],
      );
      const pendingProwlerResults = Array.from(
        lobby.pendingProwlerTargets?.entries() ?? [],
      );
      const pendingFramerResults = Array.from(
        lobby.pendingFramerTargets?.entries() ?? [],
      );
      const pendingSnatcherResults = Array.from(
        lobby.pendingSnatcherTargets?.entries() ?? [],
      );
      const pendingCursedResults = Array.from(
        lobby.pendingCursedTargets?.entries() ?? [],
      );
      const pendingMimicResults = Array.from(
        lobby.pendingMimicTargets?.entries() ?? [],
      );

      lobby.pendingWerewolfKillTargetId = null;
      lobby.pendingWerewolfKillActorUserId = null;
      lobby.pendingAlphaWolfKillTargetId = null;
      lobby.pendingHunterKillTargets = new Map();
      lobby.pendingTrapperAlertUserIds = new Set();
      lobby.pendingEscortVisitTargets = new Map();
      lobby.pendingBodyguardGuardTargets = new Map();
      lobby.pendingDoctorProtectTargets = new Map();
      lobby.pendingTrackerWatchTargets = new Map();
      lobby.pendingLookoutWatchTargets = new Map();
      lobby.pendingInvestigatorVisitTargets = new Map();
      lobby.pendingProwlerTargets = new Map();
      lobby.pendingFramerTargets = new Map();
      lobby.pendingSnatcherTargets = new Map();
      lobby.pendingCursedTargets = new Map();
      lobby.pendingMimicTargets = new Map();

      startNightActionResultsPhase(io, lobby);

      for (const [trackerUserId, trackedUserId] of pendingTrackerResults) {
        if (!aliveAtNightStart.has(trackerUserId)) continue;
        if (lobby.playerRoles.get(trackerUserId) !== 'Tracker') continue;
        if (blockedByEscort.has(trackerUserId) || blockedBySnatcher.has(trackerUserId)) {
          emitNightActionNotice(
            io,
            lobby,
            [trackerUserId],
            'You were roleblocked and learned nothing.',
          );
          continue;
        }
        const trackedName = lobby.members.get(trackedUserId)?.name ?? 'That player';
        const visitedTargetId = visitsByUserId.get(trackedUserId) ?? null;
        if (!visitedTargetId) {
          emitNightActionNotice(
            io,
            lobby,
            [trackerUserId],
            `${trackedName} did not visit anyone.`,
          );
          continue;
        }
        const visitedName = lobby.members.get(visitedTargetId)?.name ?? 'someone';
        emitNightActionNotice(
          io,
          lobby,
          [trackerUserId],
          `${trackedName} visited ${visitedName}.`,
        );
      }

      for (const [lookoutUserId, watchedUserId] of pendingLookoutResults) {
        if (!aliveAtNightStart.has(lookoutUserId)) continue;
        if (lobby.playerRoles.get(lookoutUserId) !== 'Lookout') continue;
        if (blockedByEscort.has(lookoutUserId) || blockedBySnatcher.has(lookoutUserId)) {
          emitNightActionNotice(
            io,
            lobby,
            [lookoutUserId],
            'You were roleblocked and learned nothing.',
          );
          continue;
        }
        const watchedName = lobby.members.get(watchedUserId)?.name ?? 'that player';
        const visitorIds = Array.from(visitorsByTargetUserId.get(watchedUserId) ?? [])
          .filter((id) => id && id !== lookoutUserId);
        if (visitorIds.length === 0) {
          emitNightActionNotice(
            io,
            lobby,
            [lookoutUserId],
            `No one visited ${watchedName}.`,
          );
          continue;
        }
        const visitorNames = visitorIds.map(
          (id) => lobby.members.get(id)?.name ?? 'Unknown Player',
        );
        emitNightActionNotice(
          io,
          lobby,
          [lookoutUserId],
          `${formatNameList(visitorNames)} visited ${watchedName}.`,
        );
      }

      for (const [investigatorUserId, targetUserId] of pendingInvestigatorResults) {
        if (!aliveAtNightStart.has(investigatorUserId)) continue;
        if (lobby.playerRoles.get(investigatorUserId) !== 'Investigator') continue;
        if (blockedByEscort.has(investigatorUserId) || blockedBySnatcher.has(investigatorUserId)) {
          emitNightActionNotice(
            io,
            lobby,
            [investigatorUserId],
            'You were roleblocked and learned nothing.',
          );
          continue;
        }
        const targetName = lobby.members.get(targetUserId)?.name ?? 'That player';
        const baseRole = lobby.playerRoles.get(targetUserId) ?? null;
        const effectiveRole = framedUserIds.has(targetUserId)
          ? 'Werewolf'
          : (disguisedRoleByUserId.get(targetUserId) ?? baseRole);
        const possibleRoles =
          (effectiveRole && INVESTIGATOR_RESULTS_BY_ROLE[effectiveRole]) || null;
        const formattedPossibleRoles = possibleRoles
          ? formatChoiceList(
              possibleRoles.map((role) => {
                const displayName = getRoleDisplayName(role);
                return `${articleFor(displayName)} ${displayName}`;
              }),
            )
          : null;
        emitNightActionNotice(
          io,
          lobby,
          [investigatorUserId],
          formattedPossibleRoles
            ? `${targetName} could be ${formattedPossibleRoles}.`
            : `${targetName} yields no useful clues.`,
        );
      }

      for (const [prowlerUserId, targetUserId] of pendingProwlerResults) {
        if (!aliveAtNightStart.has(prowlerUserId)) continue;
        if (lobby.playerRoles.get(prowlerUserId) !== 'Prowler') continue;
        if (blockedByEscort.has(prowlerUserId) || blockedBySnatcher.has(prowlerUserId)) {
          emitNightActionNotice(
            io,
            lobby,
            [prowlerUserId],
            'You were roleblocked and learned nothing.',
          );
          continue;
        }
        const targetName = lobby.members.get(targetUserId)?.name ?? 'That player';
        const baseRole = lobby.playerRoles.get(targetUserId) ?? null;
        const possibleRoles =
          (baseRole && INVESTIGATOR_RESULTS_BY_ROLE[baseRole]) || null;
        const formattedPossibleRoles = possibleRoles
          ? formatChoiceList(
              possibleRoles.map((role) => {
                const displayName = getRoleDisplayName(role);
                return `${articleFor(displayName)} ${displayName}`;
              }),
            )
          : null;
        emitNightActionNotice(
          io,
          lobby,
          [prowlerUserId],
          formattedPossibleRoles
            ? `${targetName} could be ${formattedPossibleRoles}.`
            : `${targetName} yields no useful clues.`,
        );
      }

      for (const [framerUserId, targetUserId] of pendingFramerResults) {
        if (!aliveAtNightStart.has(framerUserId)) continue;
        if (lobby.playerRoles.get(framerUserId) !== 'Framer') continue;
        if (blockedByEscort.has(framerUserId) || blockedBySnatcher.has(framerUserId)) {
          emitNightActionNotice(
            io,
            lobby,
            [framerUserId],
            'You were roleblocked and framed no one.',
          );
          continue;
        }
        const targetName = lobby.members.get(targetUserId)?.name ?? 'That player';
        emitNightActionNotice(io, lobby, [framerUserId], `You framed ${targetName}.`);
      }

      for (const [snatcherUserId, targetUserId] of pendingSnatcherResults) {
        if (!aliveAtNightStart.has(snatcherUserId)) continue;
        if (lobby.playerRoles.get(snatcherUserId) !== 'Snatcher') continue;
        if (blockedByEscort.has(snatcherUserId)) {
          emitNightActionNotice(
            io,
            lobby,
            [snatcherUserId],
            'You were roleblocked and snatched no one.',
          );
          continue;
        }
        const targetName = lobby.members.get(targetUserId)?.name ?? 'That player';
        emitNightActionNotice(io, lobby, [snatcherUserId], `You snatched ${targetName}.`);
      }

      for (const [cursedUserId, targetUserId] of pendingCursedResults) {
        if (!aliveAtNightStart.has(cursedUserId)) continue;
        if (lobby.playerRoles.get(cursedUserId) !== 'Cursed') continue;
        if (blockedByEscort.has(cursedUserId) || blockedBySnatcher.has(cursedUserId)) {
          emitNightActionNotice(
            io,
            lobby,
            [cursedUserId],
            'You were roleblocked and cursed no one.',
          );
          continue;
        }
        const targetName = lobby.members.get(targetUserId)?.name ?? 'That player';
        emitNightActionNotice(io, lobby, [cursedUserId], `You cursed ${targetName}.`);
      }

      for (const [mimicUserId, targetUserId] of pendingMimicResults) {
        if (!aliveAtNightStart.has(mimicUserId)) continue;
        if (lobby.playerRoles.get(mimicUserId) !== 'Mimic') continue;
        if (blockedByEscort.has(mimicUserId) || blockedBySnatcher.has(mimicUserId)) {
          emitNightActionNotice(
            io,
            lobby,
            [mimicUserId],
            'You were roleblocked and mimicked no one.',
          );
          continue;
        }
        const targetName = lobby.members.get(targetUserId)?.name ?? 'That player';
        emitNightActionNotice(
          io,
          lobby,
          [mimicUserId],
          `You mimicked ${targetName}'s role.`,
        );
      }
    },
  );
  emitLobbyUpdate(io, lobby);
};

const startNightResultsPhase = (io, lobby) => {
  const reveals = Array.isArray(lobby.pendingNightDeathReveals)
    ? lobby.pendingNightDeathReveals
    : [];

  for (const reveal of reveals) {
    const recipientUserIds = Array.from(lobby.members.keys()).filter(
      (userId) => userId !== reveal.userId,
    );
    const deathNotice = addTargetedSystemChatMessage(lobby, {
      audience: 'private',
      recipientUserIds,
      content: `${reveal.name} died during the night.`,
      tone: 'death',
    });
    emitChatMessage(io, lobby, deathNotice);
  }

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
    const currentReveal = reveals[index] ?? null;
    lobby.currentNightDeathReveal = currentReveal;
    if (currentReveal?.userId) {
      if (!lobby.publicEliminatedUserIds) {
        lobby.publicEliminatedUserIds = new Set();
      }
      lobby.publicEliminatedUserIds.add(currentReveal.userId);
    }
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
        if (!lobby.publicEliminatedUserIds) {
          lobby.publicEliminatedUserIds = new Set();
        }
        lobby.publicEliminatedUserIds.add(topTargetId);
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
  lobby.publicEliminatedUserIds = new Set();

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
  lobby.publicEliminatedUserIds?.delete(user.id);
  lobby.playerNotebooks?.delete(user.id);
  if (lobby.pendingWerewolfKillTargetId === user.id) {
    lobby.pendingWerewolfKillTargetId = null;
    lobby.pendingWerewolfKillActorUserId = null;
  }
  if (lobby.pendingWerewolfKillActorUserId === user.id) {
    lobby.pendingWerewolfKillTargetId = null;
    lobby.pendingWerewolfKillActorUserId = null;
  }
  if (lobby.pendingAlphaWolfKillTargetId === user.id) {
    lobby.pendingAlphaWolfKillTargetId = null;
  }
  lobby.pendingHunterKillTargets?.delete(user.id);
  for (const [hunterUserId, targetUserId] of lobby.pendingHunterKillTargets?.entries() ?? []) {
    if (targetUserId === user.id) {
      lobby.pendingHunterKillTargets.delete(hunterUserId);
    }
  }
  lobby.pendingTrapperAlertUserIds?.delete(user.id);
  lobby.pendingEscortVisitTargets?.delete(user.id);
  lobby.pendingBodyguardGuardTargets?.delete(user.id);
  lobby.pendingDoctorProtectTargets?.delete(user.id);
  lobby.pendingTrackerWatchTargets?.delete(user.id);
  lobby.pendingLookoutWatchTargets?.delete(user.id);
  lobby.pendingInvestigatorVisitTargets?.delete(user.id);
  lobby.pendingFramerTargets?.delete(user.id);
  lobby.pendingProwlerTargets?.delete(user.id);
  lobby.pendingSnatcherTargets?.delete(user.id);
  lobby.pendingCursedTargets?.delete(user.id);
  lobby.pendingMimicTargets?.delete(user.id);
  for (const [escortUserId, targetUserId] of lobby.pendingEscortVisitTargets?.entries() ?? []) {
    if (targetUserId === user.id) {
      lobby.pendingEscortVisitTargets.delete(escortUserId);
    }
  }
  for (const [bodyguardUserId, targetUserId] of lobby.pendingBodyguardGuardTargets?.entries() ?? []) {
    if (targetUserId === user.id) {
      lobby.pendingBodyguardGuardTargets.delete(bodyguardUserId);
    }
  }
  for (const [doctorUserId, targetUserId] of lobby.pendingDoctorProtectTargets?.entries() ?? []) {
    if (targetUserId === user.id) {
      lobby.pendingDoctorProtectTargets.delete(doctorUserId);
    }
  }
  for (const [trackerUserId, targetUserId] of lobby.pendingTrackerWatchTargets?.entries() ?? []) {
    if (targetUserId === user.id) {
      lobby.pendingTrackerWatchTargets.delete(trackerUserId);
    }
  }
  for (const [lookoutUserId, targetUserId] of lobby.pendingLookoutWatchTargets?.entries() ?? []) {
    if (targetUserId === user.id) {
      lobby.pendingLookoutWatchTargets.delete(lookoutUserId);
    }
  }
  for (const [investigatorUserId, targetUserId] of lobby.pendingInvestigatorVisitTargets?.entries() ?? []) {
    if (targetUserId === user.id) {
      lobby.pendingInvestigatorVisitTargets.delete(investigatorUserId);
    }
  }
  for (const [framerUserId, targetUserId] of lobby.pendingFramerTargets?.entries() ?? []) {
    if (targetUserId === user.id) {
      lobby.pendingFramerTargets.delete(framerUserId);
    }
  }
  for (const [prowlerUserId, targetUserId] of lobby.pendingProwlerTargets?.entries() ?? []) {
    if (targetUserId === user.id) {
      lobby.pendingProwlerTargets.delete(prowlerUserId);
    }
  }
  for (const [snatcherUserId, targetUserId] of lobby.pendingSnatcherTargets?.entries() ?? []) {
    if (targetUserId === user.id) {
      lobby.pendingSnatcherTargets.delete(snatcherUserId);
    }
  }
  for (const [cursedUserId, targetUserId] of lobby.pendingCursedTargets?.entries() ?? []) {
    if (targetUserId === user.id) {
      lobby.pendingCursedTargets.delete(cursedUserId);
    }
  }
  for (const [mimicUserId, targetUserId] of lobby.pendingMimicTargets?.entries() ?? []) {
    if (targetUserId === user.id) {
      lobby.pendingMimicTargets.delete(mimicUserId);
    }
  }
  lobby.playerRoleState?.delete(user.id);
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
