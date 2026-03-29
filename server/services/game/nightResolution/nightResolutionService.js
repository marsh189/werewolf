import {
  addNightDeathReveal,
  convertExecutionersToJesterForNightDeaths,
  setEliminationInfo,
} from '../eliminationService.js';
import { getAliveWerewolfIds } from '../gameResultsService.js';
import {
  clearNightActionSelections,
  getAliveUserIds,
} from '../gamePhaseUtils.js';
import { isVillageRole } from '../rolesService.js';
import { buildNightInteractionContext, findBodyguardGuardForTarget } from './interactionService.js';
import { emitNightActionNotice as emitNightActionNoticeImpl } from './noticeService.js';
import {
  emitImmediateNightFeedback,
  emitPendingNightResultNotices,
} from './resultsNoticeService.js';

/* =============================================================================
   Night Resolution Service

   Owns the "end of night" authoritative resolution.

   The important idea: clients never apply game effects directly.
   They only set "pending" selections on the lobby (Maps/Sets).
   When the night timer ends, we read those pending selections once and compute:
   - roleblocks + visits
   - protections / traps
   - who dies (and why)
   - investigative messages for each role

   This isolation makes the phase engine safe to refactor without touching
   socket handlers.
============================================================================= */

export const emitNightActionNotice = (
  io,
  lobby,
  recipientUserIds,
  content,
  audience = 'private',
  tone = 'death',
) => {
  // Re-exported for legacy imports.
  return emitNightActionNoticeImpl(io, lobby, recipientUserIds, content, audience, tone);
};

export const resolveNightAndStartResults = (io, lobby, startNightActionResultsPhase) => {
  // Implemented as a near-verbatim extraction from `lobbyService.js`.
  // Keeping the logic centralized here lets `lobbyService.js` stay readable.

  const aliveAtNightStart = getAliveUserIds(lobby);
  const deaths = new Set();
  const eliminationSummaryByUserId = new Map();
  const attackedTargetIds = new Set();
  const trapperVisitedUserIds = new Set();

  const {
    blockedByEscort,
    blockedBySnatcher,
    blockedByAll,
    isRoleblocked,
    alertedTrappers,
    doctorProtectedUserIds,
    framedUserIds,
    disguisedRoleByUserId,
    visitsByUserId,
    visitorsByTargetUserId,
    addVisit,
  } = buildNightInteractionContext(lobby, aliveAtNightStart);

  const setNightEliminationSummary = (userId, summary) => {
    if (!userId || !summary) return;
    if (eliminationSummaryByUserId.has(userId)) return;
    eliminationSummaryByUserId.set(userId, summary);
  };

  /* ---------------------------------------------------------------------------
     Interactions

     `buildNightInteractionContext` precomputes:
     - roleblocks (escort/snatcher)
     - the visit graph (who visited whom)
     - doctor protections + trapper alerts
     - deception flags (frame / disguise)
  --------------------------------------------------------------------------- */

  /* ---------------------------------------------------------------------------
     Resolve attacks (werewolves / alpha / hunter) + protections
  --------------------------------------------------------------------------- */

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
        const randomWerewolfId = aliveWerewolfIds[Math.floor(Math.random() * aliveWerewolfIds.length)];
        deaths.add(randomWerewolfId);
        setNightEliminationSummary(randomWerewolfId, 'Killed by the Trapper.');
      }
    } else if (!doctorProtectedUserIds.has(alphaWolfTargetId)) {
      const bodyguardGuardUserId = findBodyguardGuardForTarget(
        lobby,
        alphaWolfTargetId,
        aliveAtNightStart,
        blockedByAll,
      );
      const resolvedVictimUserId = bodyguardGuardUserId ?? alphaWolfTargetId;
      deaths.add(resolvedVictimUserId);
      if (bodyguardGuardUserId) {
        const targetName = lobby.members.get(alphaWolfTargetId)?.name ?? 'their target';
        setNightEliminationSummary(
          resolvedVictimUserId,
          `Killed protecting ${targetName} (Alpha Wolf attack).`,
        );
      } else {
        setNightEliminationSummary(resolvedVictimUserId, 'Killed by the Alpha Wolf.');
      }
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
    const aliveWerewolfIds2 = getAliveWerewolfIds(lobby, aliveAtNightStart);
    if (aliveWerewolfIds2.length > 0) {
      const randomWerewolfId = aliveWerewolfIds2[Math.floor(Math.random() * aliveWerewolfIds2.length)];
      deaths.add(randomWerewolfId);
      setNightEliminationSummary(randomWerewolfId, 'Killed by the Trapper.');
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
        blockedByAll,
      );
      const resolvedVictimUserId = bodyguardGuardUserId ?? werewolfTargetId;
      deaths.add(resolvedVictimUserId);
      if (bodyguardGuardUserId) {
        const targetName = lobby.members.get(werewolfTargetId)?.name ?? 'their target';
        setNightEliminationSummary(
          resolvedVictimUserId,
          `Killed protecting ${targetName} (werewolf attack).`,
        );
      } else {
        setNightEliminationSummary(resolvedVictimUserId, 'Killed by a werewolf.');
      }
    }
  }

  for (const [hunterUserId, targetUserId] of (lobby.pendingHunterKillTargets?.entries() ?? [])) {
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
      setNightEliminationSummary(hunterUserId, 'Killed by the Trapper.');
      continue;
    }

    if (!doctorProtectedUserIds.has(targetUserId)) {
      const bodyguardGuardUserId = findBodyguardGuardForTarget(
        lobby,
        targetUserId,
        aliveAtNightStart,
        blockedByAll,
      );
      const resolvedVictimUserId = bodyguardGuardUserId ?? targetUserId;
      deaths.add(resolvedVictimUserId);
      if (bodyguardGuardUserId) {
        const targetName = lobby.members.get(targetUserId)?.name ?? 'their target';
        setNightEliminationSummary(
          resolvedVictimUserId,
          `Shot protecting ${targetName} (Hunter shot).`,
        );
      } else {
        setNightEliminationSummary(resolvedVictimUserId, 'Shot by the Hunter.');
      }
      const resolvedVictimRole = lobby.playerRoles.get(resolvedVictimUserId);
      if (isVillageRole(resolvedVictimRole)) {
        deaths.add(hunterUserId);
        setNightEliminationSummary(hunterUserId, 'Died from guilt.');
      }
    }
  }

  for (const [doctorUserId, protectedUserId] of (lobby.pendingDoctorProtectTargets?.entries() ?? [])) {
    if (!aliveAtNightStart.has(doctorUserId)) continue;
    if (blockedByEscort.has(doctorUserId)) continue;
    if (blockedBySnatcher.has(doctorUserId)) continue;
    if (!aliveAtNightStart.has(protectedUserId)) continue;
    if (lobby.playerRoles.get(doctorUserId) !== 'Doctor') continue;
    if (doctorUserId !== protectedUserId) {
      addVisit(doctorUserId, protectedUserId);
    }
  }

  for (const [bodyguardUserId, guardedUserId] of (lobby.pendingBodyguardGuardTargets?.entries() ?? [])) {
    if (!aliveAtNightStart.has(bodyguardUserId)) continue;
    if (blockedByEscort.has(bodyguardUserId)) continue;
    if (blockedBySnatcher.has(bodyguardUserId)) continue;
    if (!aliveAtNightStart.has(guardedUserId)) continue;
    if (lobby.playerRoles.get(bodyguardUserId) !== 'Bodyguard') continue;
    addVisit(bodyguardUserId, guardedUserId);
  }

  for (const [trackerUserId, trackedUserId] of (lobby.pendingTrackerWatchTargets?.entries() ?? [])) {
    if (!aliveAtNightStart.has(trackerUserId)) continue;
    if (blockedByEscort.has(trackerUserId)) continue;
    if (blockedBySnatcher.has(trackerUserId)) continue;
    if (!aliveAtNightStart.has(trackedUserId)) continue;
    if (lobby.playerRoles.get(trackerUserId) !== 'Tracker') continue;
    addVisit(trackerUserId, trackedUserId);
  }

  for (const [lookoutUserId, watchedUserId] of (lobby.pendingLookoutWatchTargets?.entries() ?? [])) {
    if (!aliveAtNightStart.has(lookoutUserId)) continue;
    if (blockedByEscort.has(lookoutUserId)) continue;
    if (blockedBySnatcher.has(lookoutUserId)) continue;
    if (!aliveAtNightStart.has(watchedUserId)) continue;
    if (lobby.playerRoles.get(lookoutUserId) !== 'Lookout') continue;
    addVisit(lookoutUserId, watchedUserId);
  }

  for (const [investigatorUserId, targetUserId] of (lobby.pendingInvestigatorVisitTargets?.entries() ?? [])) {
    if (!aliveAtNightStart.has(investigatorUserId)) continue;
    if (blockedByEscort.has(investigatorUserId)) continue;
    if (blockedBySnatcher.has(investigatorUserId)) continue;
    if (!aliveAtNightStart.has(targetUserId)) continue;
    if (lobby.playerRoles.get(investigatorUserId) !== 'Investigator') continue;
    addVisit(investigatorUserId, targetUserId);
  }

  for (const [prowlerUserId, targetUserId] of (lobby.pendingProwlerTargets?.entries() ?? [])) {
    if (!aliveAtNightStart.has(prowlerUserId)) continue;
    if (blockedByEscort.has(prowlerUserId)) continue;
    if (blockedBySnatcher.has(prowlerUserId)) continue;
    if (!aliveAtNightStart.has(targetUserId)) continue;
    if (lobby.playerRoles.get(prowlerUserId) !== 'Prowler') continue;
    addVisit(prowlerUserId, targetUserId);
  }

  /* ---------------------------------------------------------------------------
     Apply deaths + queue reveal payloads
  --------------------------------------------------------------------------- */

  for (const userId of deaths) {
    setEliminationInfo(lobby, userId, {
      kind: 'night',
      summary: eliminationSummaryByUserId.get(userId) ?? 'Killed during the night.',
    });
    addNightDeathReveal(lobby, userId);
  }
  convertExecutionersToJesterForNightDeaths(lobby, deaths);

  /* ---------------------------------------------------------------------------
     Emit per-role feedback (what you learned / whether your target was attacked)
  --------------------------------------------------------------------------- */

  emitImmediateNightFeedback(io, lobby, {
    aliveAtNightStart,
    aliveWerewolfIds,
    alphaWolfTargetId,
    werewolfTargetId,
    attackedTargetIds,
    trapperVisitedUserIds,
    blockedByEscort,
    blockedBySnatcher,
    deaths,
  });

  const pendingTrackerResults = Array.from(lobby.pendingTrackerWatchTargets?.entries() ?? []);
  const pendingLookoutResults = Array.from(lobby.pendingLookoutWatchTargets?.entries() ?? []);
  const pendingInvestigatorResults = Array.from(lobby.pendingInvestigatorVisitTargets?.entries() ?? []);
  const pendingProwlerResults = Array.from(lobby.pendingProwlerTargets?.entries() ?? []);
  const pendingFramerResults = Array.from(lobby.pendingFramerTargets?.entries() ?? []);
  const pendingSnatcherResults = Array.from(lobby.pendingSnatcherTargets?.entries() ?? []);
  const pendingCursedResults = Array.from(lobby.pendingCursedTargets?.entries() ?? []);
  const pendingMimicResults = Array.from(lobby.pendingMimicTargets?.entries() ?? []);

  clearNightActionSelections(lobby);

  // Immediately transition to the "night action results" phase (and schedule the next phase).
  startNightActionResultsPhase(io, lobby);

  emitPendingNightResultNotices(
    io,
    lobby,
    {
      aliveAtNightStart,
      isRoleblocked,
      blockedByEscort,
      visitsByUserId,
      visitorsByTargetUserId,
      framedUserIds,
      disguisedRoleByUserId,
    },
    {
      pendingTrackerResults,
      pendingLookoutResults,
      pendingInvestigatorResults,
      pendingProwlerResults,
      pendingFramerResults,
      pendingSnatcherResults,
      pendingCursedResults,
      pendingMimicResults,
    },
  );

};
