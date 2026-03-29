import {
  INVESTIGATOR_RESULTS_BY_ROLE,
  formatNameList,
  formatPossibleRoleArticles,
} from '../gamePhaseUtils.js';
import { emitNightActionNotice } from './noticeService.js';

/* =============================================================================
   Night Resolution: Result Notices

   After the night is resolved and we transition to `nightActionResults`, we emit
   per-role messages describing what each player learned and whether their
   target was attacked.
============================================================================= */

export const emitImmediateNightFeedback = (io, lobby, context) => {
  const {
    aliveAtNightStart,
    aliveWerewolfIds,
    alphaWolfTargetId,
    werewolfTargetId,
    attackedTargetIds,
    trapperVisitedUserIds,
    blockedByEscort,
    blockedBySnatcher,
    deaths,
  } = context;

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

  for (const [doctorUserId, protectedUserId] of (lobby.pendingDoctorProtectTargets?.entries() ?? [])) {
    if (!aliveAtNightStart.has(doctorUserId)) continue;
    if (blockedByEscort.has(doctorUserId)) continue;
    if (blockedBySnatcher.has(doctorUserId)) continue;
    if (!attackedTargetIds.has(protectedUserId)) continue;
    const targetName = lobby.members.get(protectedUserId)?.name ?? 'Your target';
    emitNightActionNotice(io, lobby, [doctorUserId], `${targetName} was attacked during the night.`);
  }

  for (const [bodyguardUserId, guardedUserId] of (lobby.pendingBodyguardGuardTargets?.entries() ?? [])) {
    if (!aliveAtNightStart.has(bodyguardUserId)) continue;
    if (blockedByEscort.has(bodyguardUserId)) continue;
    if (blockedBySnatcher.has(bodyguardUserId)) continue;
    if (!attackedTargetIds.has(guardedUserId)) continue;
    const targetName = lobby.members.get(guardedUserId)?.name ?? 'Your target';
    emitNightActionNotice(io, lobby, [bodyguardUserId], `${targetName} was attacked during the night.`);
  }

  for (const trapperUserId of trapperVisitedUserIds) {
    emitNightActionNotice(io, lobby, [trapperUserId], 'Someone visited you during the night.');
  }
};

export const emitPendingNightResultNotices = (io, lobby, context, pending) => {
  const {
    aliveAtNightStart,
    isRoleblocked,
    blockedByEscort,
    visitsByUserId,
    visitorsByTargetUserId,
    framedUserIds,
    disguisedRoleByUserId,
  } = context;

  const {
    pendingTrackerResults,
    pendingLookoutResults,
    pendingInvestigatorResults,
    pendingProwlerResults,
    pendingFramerResults,
    pendingSnatcherResults,
    pendingCursedResults,
    pendingMimicResults,
  } = pending;

  for (const [trackerUserId, trackedUserId] of pendingTrackerResults) {
    if (!aliveAtNightStart.has(trackerUserId)) continue;
    if (lobby.playerRoles.get(trackerUserId) !== 'Tracker') continue;
    if (isRoleblocked(trackerUserId)) {
      emitNightActionNotice(io, lobby, [trackerUserId], 'You were roleblocked and learned nothing.');
      continue;
    }
    const trackedName = lobby.members.get(trackedUserId)?.name ?? 'That player';
    const visitedTargetId = visitsByUserId.get(trackedUserId) ?? null;
    if (!visitedTargetId) {
      emitNightActionNotice(io, lobby, [trackerUserId], `${trackedName} did not visit anyone.`);
      continue;
    }
    const visitedName = lobby.members.get(visitedTargetId)?.name ?? 'someone';
    emitNightActionNotice(io, lobby, [trackerUserId], `${trackedName} visited ${visitedName}.`);
  }

  for (const [lookoutUserId, watchedUserId] of pendingLookoutResults) {
    if (!aliveAtNightStart.has(lookoutUserId)) continue;
    if (lobby.playerRoles.get(lookoutUserId) !== 'Lookout') continue;
    if (isRoleblocked(lookoutUserId)) {
      emitNightActionNotice(io, lobby, [lookoutUserId], 'You were roleblocked and learned nothing.');
      continue;
    }
    const watchedName = lobby.members.get(watchedUserId)?.name ?? 'that player';
    const visitorIds = Array.from(visitorsByTargetUserId.get(watchedUserId) ?? []).filter(
      (id) => id && id !== lookoutUserId,
    );
    if (visitorIds.length === 0) {
      emitNightActionNotice(io, lobby, [lookoutUserId], `No one visited ${watchedName}.`);
      continue;
    }
    const visitorNames = visitorIds.map((id) => lobby.members.get(id)?.name ?? 'Unknown Player');
    emitNightActionNotice(io, lobby, [lookoutUserId], `${formatNameList(visitorNames)} visited ${watchedName}.`);
  }

  for (const [investigatorUserId, targetUserId] of pendingInvestigatorResults) {
    if (!aliveAtNightStart.has(investigatorUserId)) continue;
    if (lobby.playerRoles.get(investigatorUserId) !== 'Investigator') continue;
    if (isRoleblocked(investigatorUserId)) {
      emitNightActionNotice(io, lobby, [investigatorUserId], 'You were roleblocked and learned nothing.');
      continue;
    }
    const targetName = lobby.members.get(targetUserId)?.name ?? 'That player';
    const baseRole = lobby.playerRoles.get(targetUserId) ?? null;
    const effectiveRole = framedUserIds.has(targetUserId)
      ? 'Werewolf'
      : (disguisedRoleByUserId.get(targetUserId) ?? baseRole);
    const possibleRoles = (effectiveRole && INVESTIGATOR_RESULTS_BY_ROLE[effectiveRole]) || null;
    const formattedPossibleRoles = formatPossibleRoleArticles(possibleRoles);
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
    if (isRoleblocked(prowlerUserId)) {
      emitNightActionNotice(io, lobby, [prowlerUserId], 'You were roleblocked and learned nothing.');
      continue;
    }
    const targetName = lobby.members.get(targetUserId)?.name ?? 'That player';
    const baseRole = lobby.playerRoles.get(targetUserId) ?? null;
    const possibleRoles = (baseRole && INVESTIGATOR_RESULTS_BY_ROLE[baseRole]) || null;
    const formattedPossibleRoles = formatPossibleRoleArticles(possibleRoles);
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
    if (isRoleblocked(framerUserId)) {
      emitNightActionNotice(io, lobby, [framerUserId], 'You were roleblocked and framed no one.');
      continue;
    }
    const targetName = lobby.members.get(targetUserId)?.name ?? 'That player';
    emitNightActionNotice(io, lobby, [framerUserId], `You framed ${targetName}.`);
  }

  for (const [snatcherUserId, targetUserId] of pendingSnatcherResults) {
    if (!aliveAtNightStart.has(snatcherUserId)) continue;
    if (lobby.playerRoles.get(snatcherUserId) !== 'Snatcher') continue;
    if (blockedByEscort.has(snatcherUserId)) {
      emitNightActionNotice(io, lobby, [snatcherUserId], 'You were roleblocked and snatched no one.');
      continue;
    }
    const targetName = lobby.members.get(targetUserId)?.name ?? 'That player';
    emitNightActionNotice(io, lobby, [snatcherUserId], `You snatched ${targetName}.`);
  }

  for (const [cursedUserId, targetUserId] of pendingCursedResults) {
    if (!aliveAtNightStart.has(cursedUserId)) continue;
    if (lobby.playerRoles.get(cursedUserId) !== 'Cursed') continue;
    if (isRoleblocked(cursedUserId)) {
      emitNightActionNotice(io, lobby, [cursedUserId], 'You were roleblocked and cursed no one.');
      continue;
    }
    const targetName = lobby.members.get(targetUserId)?.name ?? 'That player';
    emitNightActionNotice(io, lobby, [cursedUserId], `You cursed ${targetName}.`);
  }

  for (const [mimicUserId, targetUserId] of pendingMimicResults) {
    if (!aliveAtNightStart.has(mimicUserId)) continue;
    if (lobby.playerRoles.get(mimicUserId) !== 'Mimic') continue;
    if (isRoleblocked(mimicUserId)) {
      emitNightActionNotice(io, lobby, [mimicUserId], 'You were roleblocked and mimicked no one.');
      continue;
    }
    const targetName = lobby.members.get(targetUserId)?.name ?? 'That player';
    emitNightActionNotice(io, lobby, [mimicUserId], `You mimicked ${targetName}'s role.`);
  }
};

