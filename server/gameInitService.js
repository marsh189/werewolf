/* =============================================================================
   Game Init Payload

   `game:init` is called by clients on page load and on certain reconnect paths.
   This service builds the per-user view of game state (including role-private
   fields like werewolf user ids and the user's current selected night target).
============================================================================= */

const isWerewolfRole = (role) =>
  role === 'Werewolf' ||
  role === 'AlphaWolf' ||
  role === 'Framer' ||
  role === 'Prowler' ||
  role === 'Cursed' ||
  role === 'Snatcher' ||
  role === 'Mimic';

const getSelectedNightTargetUserId = ({ lobby, userId, myRole }) => {
  if (myRole === 'AlphaWolf') return lobby.pendingAlphaWolfKillTargetId ?? null;
  if (myRole === 'Werewolf') return lobby.pendingWerewolfKillTargetId ?? null;
  if (myRole === 'Hunter') return lobby.pendingHunterKillTargets?.get(userId) ?? null;
  if (myRole === 'Escort') return lobby.pendingEscortVisitTargets?.get(userId) ?? null;
  if (myRole === 'Bodyguard') return lobby.pendingBodyguardGuardTargets?.get(userId) ?? null;
  if (myRole === 'Doctor') return lobby.pendingDoctorProtectTargets?.get(userId) ?? null;
  if (myRole === 'Tracker') return lobby.pendingTrackerWatchTargets?.get(userId) ?? null;
  if (myRole === 'Lookout') return lobby.pendingLookoutWatchTargets?.get(userId) ?? null;
  if (myRole === 'Investigator')
    return lobby.pendingInvestigatorVisitTargets?.get(userId) ?? null;
  if (myRole === 'Framer') return lobby.pendingFramerTargets?.get(userId) ?? null;
  if (myRole === 'Prowler') return lobby.pendingProwlerTargets?.get(userId) ?? null;
  if (myRole === 'Snatcher') return lobby.pendingSnatcherTargets?.get(userId) ?? null;
  if (myRole === 'Cursed') return lobby.pendingCursedTargets?.get(userId) ?? null;
  if (myRole === 'Mimic') return lobby.pendingMimicTargets?.get(userId) ?? null;
  return null;
};

export const buildGameInitPayloadForUser = ({ lobby, userId }) => {
  const myRole = lobby.playerRoles.get(userId) ?? null;
  const myRoleState = lobby.playerRoleState?.get(userId) ?? {};

  const executionerTargetUserId =
    myRole === 'Executioner'
      ? (myRoleState.executionerTargetUserId ?? null)
      : null;
  const executionerTargetName = executionerTargetUserId
    ? (lobby.members.get(executionerTargetUserId)?.name ?? 'Unknown Player')
    : null;

  const werewolfUserIds = isWerewolfRole(myRole)
    ? Array.from(lobby.playerRoles.entries())
        .filter(([, role]) => isWerewolfRole(role))
        .map(([id]) => id)
    : [];

  const selectedNightTargetUserId = getSelectedNightTargetUserId({
    lobby,
    userId,
    myRole,
  });

  return {
    started: lobby.started,
    phase: lobby.gamePhase ?? 'lobby',
    dayNumber: lobby.dayNumber ?? null,
    nightNumber: lobby.nightNumber ?? null,
    phaseEndsAt: lobby.phaseEndsAt ?? null,
    currentNightDeathReveal: lobby.currentNightDeathReveal ?? null,
    currentEliminationResult: lobby.currentEliminationResult ?? null,
    role: myRole,
    werewolfUserIds,
    hunterShotsRemaining:
      myRole === 'Hunter' ? (myRoleState.hunterShotsRemaining ?? 0) : null,
    trapperAlertsRemaining:
      myRole === 'Trapper' ? (myRoleState.trapperAlertsRemaining ?? 0) : null,
    trapperAlertActive:
      myRole === 'Trapper'
        ? (lobby.pendingTrapperAlertUserIds?.has(userId) ?? false)
        : false,
    nightKillTargetUserId:
      myRole === 'AlphaWolf' || myRole === 'Werewolf' || myRole === 'Hunter'
        ? selectedNightTargetUserId
        : null,
    escortVisitTargetUserId: myRole === 'Escort' ? selectedNightTargetUserId : null,
    bodyguardGuardTargetUserId:
      myRole === 'Bodyguard' ? selectedNightTargetUserId : null,
    doctorProtectTargetUserId:
      myRole === 'Doctor' ? selectedNightTargetUserId : null,
    doctorSelfProtectUsed:
      myRole === 'Doctor' ? (myRoleState.doctorSelfProtectUsed ?? false) : null,
    trackerWatchTargetUserId:
      myRole === 'Tracker' ? selectedNightTargetUserId : null,
    lookoutWatchTargetUserId:
      myRole === 'Lookout' ? selectedNightTargetUserId : null,
    investigatorVisitTargetUserId:
      myRole === 'Investigator' ? selectedNightTargetUserId : null,
    framerTargetUserId: myRole === 'Framer' ? selectedNightTargetUserId : null,
    prowlerTargetUserId: myRole === 'Prowler' ? selectedNightTargetUserId : null,
    snatcherTargetUserId:
      myRole === 'Snatcher' ? selectedNightTargetUserId : null,
    cursedTargetUserId: myRole === 'Cursed' ? selectedNightTargetUserId : null,
    mimicTargetUserId: myRole === 'Mimic' ? selectedNightTargetUserId : null,
    executionerTargetUserId,
    executionerTargetName,
    hostUserId: lobby.hostUserId,
    canWriteNotebook: !lobby.eliminatedUserIds?.has(userId),
  };
};
