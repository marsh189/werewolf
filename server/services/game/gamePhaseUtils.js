/* =============================================================================
   Game Phase Utilities (Server)

   Shared helpers used by the phase engine / night resolution.
   Kept in a separate module to keep `lobbyService.js` readable.
============================================================================= */

export const schedulePhaseTransition = (io, lobby, durationMs, onComplete) => {
  if (lobby.phaseTimeoutId) clearTimeout(lobby.phaseTimeoutId);
  lobby.phaseEndsAt = Date.now() + durationMs;
  lobby.phaseTimeoutId = setTimeout(() => {
    lobby.phaseTimeoutId = null;
    onComplete();
  }, durationMs);
};

export const getAliveUserIds = (lobby) =>
  new Set(
    Array.from(lobby.members.keys()).filter(
      (userId) => !lobby.eliminatedUserIds.has(userId),
    ),
  );

export const clearNightActionSelections = (lobby) => {
  lobby.pendingNightDeathReveals = lobby.pendingNightDeathReveals ?? [];
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
};

export const formatNameList = (names) => {
  const cleaned = (Array.isArray(names) ? names : []).filter(Boolean);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
};

export const getRoleDisplayName = (roleName) => {
  if (roleName === 'AlphaWolf') return 'Alpha Wolf';
  return roleName;
};

export const articleFor = (word) => (/^[aeiou]/i.test(String(word ?? '').trim()) ? 'an' : 'a');

export const formatChoiceList = (items) => {
  const cleaned = (Array.isArray(items) ? items : []).filter(Boolean);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} or ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')}, or ${cleaned[cleaned.length - 1]}`;
};

export const formatPossibleRoleArticles = (possibleRoles) => {
  if (!Array.isArray(possibleRoles) || possibleRoles.length === 0) return null;
  return formatChoiceList(
    possibleRoles.map((role) => {
      const displayName = getRoleDisplayName(role);
      return `${articleFor(displayName)} ${displayName}`;
    }),
  );
};

export const INVESTIGATOR_RESULTS_BY_ROLE = {
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

