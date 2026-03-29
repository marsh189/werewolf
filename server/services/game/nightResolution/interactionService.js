import { hasNightAction } from '../rolesService.js';

/* =============================================================================
   Night Resolution: Interactions (Roleblocks + Visits + Protections)

   Builds the "visit graph" and the primary roleblock/protection sets for a night.
   This keeps `nightResolutionService` focused on the actual elimination logic.
============================================================================= */

export const findBodyguardGuardForTarget = (
  lobby,
  targetUserId,
  aliveAtNightStart,
  blockedByAll,
) => {
  for (const [bodyguardUserId, guardedUserId] of (
    lobby.pendingBodyguardGuardTargets?.entries() ?? []
  )) {
    if (guardedUserId !== targetUserId) continue;
    if (!aliveAtNightStart.has(bodyguardUserId)) continue;
    if (!aliveAtNightStart.has(guardedUserId)) continue;
    if (blockedByAll.has(bodyguardUserId)) continue;
    if (lobby.playerRoles.get(bodyguardUserId) !== 'Bodyguard') continue;
    return bodyguardUserId;
  }
  return null;
};

const getDoctorProtectedUserIds = (lobby, aliveAtNightStart, blockedByAll) => {
  const protectedUserIds = new Set();
  for (const [doctorUserId, protectedUserId] of (
    lobby.pendingDoctorProtectTargets?.entries() ?? []
  )) {
    if (!aliveAtNightStart.has(doctorUserId)) continue;
    if (!aliveAtNightStart.has(protectedUserId)) continue;
    if (blockedByAll.has(doctorUserId)) continue;
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

export const buildNightInteractionContext = (lobby, aliveAtNightStart) => {
  const blockedByEscort = new Set();
  const blockedBySnatcher = new Set();

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

  /* ---------------------------------------------------------------------------
     Roleblocks (Escort + Snatcher)
  --------------------------------------------------------------------------- */

  for (const [escortUserId, targetUserId] of (lobby.pendingEscortVisitTargets?.entries() ?? [])) {
    if (!aliveAtNightStart.has(escortUserId)) continue;
    if (!aliveAtNightStart.has(targetUserId)) continue;
    if (lobby.playerRoles.get(escortUserId) === 'Escort') {
      addVisit(escortUserId, targetUserId);
    }
    const targetRole = lobby.playerRoles.get(targetUserId);
    if (!hasNightAction(targetRole)) continue;
    blockedByEscort.add(targetUserId);
  }

  for (const [snatcherUserId, targetUserId] of (lobby.pendingSnatcherTargets?.entries() ?? [])) {
    if (!aliveAtNightStart.has(snatcherUserId)) continue;
    if (!aliveAtNightStart.has(targetUserId)) continue;
    if (blockedByEscort.has(snatcherUserId)) continue;
    if (lobby.playerRoles.get(snatcherUserId) !== 'Snatcher') continue;
    addVisit(snatcherUserId, targetUserId);
    const targetRole = lobby.playerRoles.get(targetUserId);
    if (!hasNightAction(targetRole)) continue;
    blockedBySnatcher.add(targetUserId);
  }

  const isRoleblocked = (userId) =>
    blockedByEscort.has(userId) || blockedBySnatcher.has(userId);

  /* ---------------------------------------------------------------------------
     Protections (Doctor) + Traps (Trapper)
  --------------------------------------------------------------------------- */

  const alertedTrappers = new Set(
    Array.from(lobby.pendingTrapperAlertUserIds ?? new Set()).filter(
      (userId) =>
        aliveAtNightStart.has(userId) &&
        !blockedByEscort.has(userId) &&
        !blockedBySnatcher.has(userId),
    ),
  );

  const blockedByAll = new Set([...blockedByEscort, ...blockedBySnatcher]);
  const doctorProtectedUserIds = getDoctorProtectedUserIds(
    lobby,
    aliveAtNightStart,
    blockedByAll,
  );

  /* ---------------------------------------------------------------------------
     Deception (Cursed / Framer / Mimic)
  --------------------------------------------------------------------------- */

  const cursedUserIds = new Set();
  for (const [cursedUserId, targetUserId] of (lobby.pendingCursedTargets?.entries() ?? [])) {
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
  for (const [framerUserId, targetUserId] of (lobby.pendingFramerTargets?.entries() ?? [])) {
    if (!aliveAtNightStart.has(framerUserId)) continue;
    if (!aliveAtNightStart.has(targetUserId)) continue;
    if (blockedByEscort.has(framerUserId)) continue;
    if (blockedBySnatcher.has(framerUserId)) continue;
    if (lobby.playerRoles.get(framerUserId) !== 'Framer') continue;
    addVisit(framerUserId, targetUserId);
    framedUserIds.add(targetUserId);
  }

  for (const [mimicUserId, targetUserId] of (lobby.pendingMimicTargets?.entries() ?? [])) {
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

  return {
    blockedByEscort,
    blockedBySnatcher,
    blockedByAll,
    isRoleblocked,
    alertedTrappers,
    doctorProtectedUserIds,
    cursedUserIds,
    framedUserIds,
    disguisedRoleByUserId,
    visitsByUserId,
    visitorsByTargetUserId,
    addVisit,
  };
};

