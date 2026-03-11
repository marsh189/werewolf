import {
  addNightDeathReveal,
  convertExecutionersToJesterForNightDeaths,
  emitLobbyUpdate,
} from '../lobbyService.js';
import { requireAckAndLobby, requireLobbyMembership, requireTargetUserId } from './shared.js';

const isRapidAction = (lobby, userId, actionKey, minIntervalMs = 250) => {
  if (!lobby.actionTimestamps) {
    lobby.actionTimestamps = new Map();
  }
  const key = `${actionKey}:${userId}`;
  const now = Date.now();
  const lastAt = lobby.actionTimestamps.get(key) ?? 0;
  if (now - lastAt < minIntervalMs) {
    return true;
  }
  lobby.actionTimestamps.set(key, now);
  return false;
};

export const registerGameHandlers = ({ io, socket, user }) => {
  socket.on('game:init', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const myRole = lobby.playerRoles.get(user.id) ?? null;
    const myRoleState = lobby.playerRoleState?.get(user.id) ?? {};
    const executionerTargetUserId =
      myRole === 'Executioner'
        ? (myRoleState.executionerTargetUserId ?? null)
        : null;
    const executionerTargetName = executionerTargetUserId
      ? (lobby.members.get(executionerTargetUserId)?.name ?? 'Unknown Player')
      : null;
    const isWerewolfRole = (role) =>
      role === 'Werewolf' ||
      role === 'AlphaWolf' ||
      role === 'Framer' ||
      role === 'Prowler' ||
      role === 'Cursed' ||
      role === 'Snatcher' ||
      role === 'Mimic';

    const werewolfUserIds = isWerewolfRole(myRole)
      ? Array.from(lobby.playerRoles.entries())
          .filter(([, role]) => isWerewolfRole(role))
          .map(([userId]) => userId)
      : [];
    const escortVisitTargetUserId =
      myRole === 'Escort'
        ? (lobby.pendingEscortVisitTargets?.get(user.id) ?? null)
        : null;
    const bodyguardGuardTargetUserId =
      myRole === 'Bodyguard'
        ? (lobby.pendingBodyguardGuardTargets?.get(user.id) ?? null)
        : null;
    const doctorProtectTargetUserId =
      myRole === 'Doctor'
        ? (lobby.pendingDoctorProtectTargets?.get(user.id) ?? null)
        : null;
    const trackerWatchTargetUserId =
      myRole === 'Tracker'
        ? (lobby.pendingTrackerWatchTargets?.get(user.id) ?? null)
        : null;
    const lookoutWatchTargetUserId =
      myRole === 'Lookout'
        ? (lobby.pendingLookoutWatchTargets?.get(user.id) ?? null)
        : null;
    const investigatorVisitTargetUserId =
      myRole === 'Investigator'
        ? (lobby.pendingInvestigatorVisitTargets?.get(user.id) ?? null)
        : null;
    const framerTargetUserId =
      myRole === 'Framer' ? (lobby.pendingFramerTargets?.get(user.id) ?? null) : null;
    const prowlerTargetUserId =
      myRole === 'Prowler' ? (lobby.pendingProwlerTargets?.get(user.id) ?? null) : null;
    const snatcherTargetUserId =
      myRole === 'Snatcher'
        ? (lobby.pendingSnatcherTargets?.get(user.id) ?? null)
        : null;
    const cursedTargetUserId =
      myRole === 'Cursed' ? (lobby.pendingCursedTargets?.get(user.id) ?? null) : null;
    const mimicTargetUserId =
      myRole === 'Mimic'
        ? (lobby.pendingMimicTargets?.get(user.id) ?? null)
        : null;
    const nightKillTargetUserId =
      myRole === 'AlphaWolf'
        ? (lobby.pendingAlphaWolfKillTargetId ?? null)
        : myRole === 'Werewolf'
          ? (lobby.pendingWerewolfKillTargetId ?? null)
          : myRole === 'Hunter'
            ? (lobby.pendingHunterKillTargets?.get(user.id) ?? null)
            : null;

    return ack({
      ok: true,
      game: {
        started: lobby.started,
        phase: lobby.gamePhase ?? 'lobby',
        dayNumber: lobby.dayNumber ?? null,
        nightNumber: lobby.nightNumber ?? null,
        phaseEndsAt: lobby.phaseEndsAt ?? null,
        currentNightDeathReveal: lobby.currentNightDeathReveal ?? null,
        currentEliminationResult: lobby.currentEliminationResult ?? null,
        role: myRole,
        werewolfUserIds,
        hunterShotsRemaining: myRole === 'Hunter' ? (myRoleState.hunterShotsRemaining ?? 0) : null,
        trapperAlertsRemaining: myRole === 'Trapper' ? (myRoleState.trapperAlertsRemaining ?? 0) : null,
        trapperAlertActive:
          myRole === 'Trapper'
            ? (lobby.pendingTrapperAlertUserIds?.has(user.id) ?? false)
            : false,
        nightKillTargetUserId,
        escortVisitTargetUserId,
        bodyguardGuardTargetUserId,
        doctorProtectTargetUserId,
        doctorSelfProtectUsed: myRole === 'Doctor' ? (myRoleState.doctorSelfProtectUsed ?? false) : null,
        trackerWatchTargetUserId,
        lookoutWatchTargetUserId,
        investigatorVisitTargetUserId,
        framerTargetUserId,
        prowlerTargetUserId,
        snatcherTargetUserId,
        cursedTargetUserId,
        mimicTargetUserId,
        executionerTargetUserId,
        executionerTargetName,
        hostUserId: lobby.hostUserId,
        canWriteNotebook: !lobby.eliminatedUserIds?.has(user.id),
      },
    });
  });

  socket.on('game:getNotebook', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'day' && lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not available in current phase' });
    }
    if (!lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Notebook can only be viewed for dead players' });
    }

    const member = lobby.members.get(targetUserId);
    return ack({
      ok: true,
      notebook: {
        userId: targetUserId,
        name: member?.name ?? 'Unknown Player',
        content: lobby.playerNotebooks?.get(targetUserId) ?? '',
      },
    });
  });

  socket.on('game:nightKill', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Werewolf' && myRole !== 'AlphaWolf' && myRole !== 'Hunter') {
      return ack({ ok: false, error: 'Your role cannot perform a night kill' });
    }
    if (myRole === 'AlphaWolf' && targetUserId === user.id) {
      return ack({ ok: false, error: 'Alpha Wolf cannot target themselves' });
    }
    if (myRole === 'Hunter' && targetUserId === user.id) {
      return ack({ ok: false, error: 'Hunter cannot target themselves' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }
    if (isRapidAction(lobby, user.id, 'nightKill')) {
      return ack({ ok: true, throttled: true });
    }

    if (myRole === 'AlphaWolf') {
      if (lobby.pendingAlphaWolfKillTargetId === targetUserId) {
        return ack({ ok: true, unchanged: true });
      }
      lobby.pendingAlphaWolfKillTargetId = targetUserId;
    } else if (myRole === 'Werewolf') {
      if (lobby.pendingWerewolfKillTargetId === targetUserId) {
        return ack({ ok: true, unchanged: true });
      }
      lobby.pendingWerewolfKillTargetId = targetUserId;
      lobby.pendingWerewolfKillActorUserId = user.id;
    } else {
      if (!lobby.pendingHunterKillTargets) {
        lobby.pendingHunterKillTargets = new Map();
      }
      const myRoleState = lobby.playerRoleState?.get(user.id);
      if ((myRoleState?.hunterShotsRemaining ?? 0) <= 0) {
        return ack({ ok: false, error: 'No Hunter shots remaining' });
      }
      if (lobby.pendingHunterKillTargets.get(user.id) === targetUserId) {
        return ack({ ok: true, unchanged: true });
      }
      lobby.pendingHunterKillTargets.set(user.id, targetUserId);
    }
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:frame', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Framer') {
      return ack({ ok: false, error: 'Only Framer can frame' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }
    if (isRapidAction(lobby, user.id, 'frame')) {
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.pendingFramerTargets) {
      lobby.pendingFramerTargets = new Map();
    }
    if (lobby.pendingFramerTargets.get(user.id) === targetUserId) {
      return ack({ ok: true, unchanged: true });
    }
    lobby.pendingFramerTargets.set(user.id, targetUserId);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:prowl', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Prowler') {
      return ack({ ok: false, error: 'Only Prowler can prowl' });
    }
    if (targetUserId === user.id) {
      return ack({ ok: false, error: 'Prowler cannot target themselves' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }
    if (isRapidAction(lobby, user.id, 'prowl')) {
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.pendingProwlerTargets) {
      lobby.pendingProwlerTargets = new Map();
    }
    if (lobby.pendingProwlerTargets.get(user.id) === targetUserId) {
      return ack({ ok: true, unchanged: true });
    }
    lobby.pendingProwlerTargets.set(user.id, targetUserId);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:snatch', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Snatcher') {
      return ack({ ok: false, error: 'Only Snatcher can snatch' });
    }
    if (targetUserId === user.id) {
      return ack({ ok: false, error: 'Snatcher cannot target themselves' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }
    if (isRapidAction(lobby, user.id, 'snatch')) {
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.pendingSnatcherTargets) {
      lobby.pendingSnatcherTargets = new Map();
    }
    if (lobby.pendingSnatcherTargets.get(user.id) === targetUserId) {
      return ack({ ok: true, unchanged: true });
    }
    lobby.pendingSnatcherTargets.set(user.id, targetUserId);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:curse', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Cursed') {
      return ack({ ok: false, error: 'Only Cursed can curse' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }
    if (isRapidAction(lobby, user.id, 'curse')) {
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.pendingCursedTargets) {
      lobby.pendingCursedTargets = new Map();
    }
    if (lobby.pendingCursedTargets.get(user.id) === targetUserId) {
      return ack({ ok: true, unchanged: true });
    }
    lobby.pendingCursedTargets.set(user.id, targetUserId);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:mimic', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Mimic') {
      return ack({ ok: false, error: 'Only Mimic can copy roles' });
    }
    if (targetUserId === user.id) {
      return ack({ ok: false, error: 'Mimic cannot target themselves' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }
    if (isRapidAction(lobby, user.id, 'mimic')) {
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.pendingMimicTargets) {
      lobby.pendingMimicTargets = new Map();
    }
    if (lobby.pendingMimicTargets.get(user.id) === targetUserId) {
      return ack({ ok: true, unchanged: true });
    }
    lobby.pendingMimicTargets.set(user.id, targetUserId);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:escortVisit', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Escort') {
      return ack({ ok: false, error: 'Only Escort can visit' });
    }
    if (targetUserId === user.id) {
      return ack({ ok: false, error: 'Escort cannot target themselves' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }
    if (isRapidAction(lobby, user.id, 'escortVisit')) {
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.pendingEscortVisitTargets) {
      lobby.pendingEscortVisitTargets = new Map();
    }
    if (lobby.pendingEscortVisitTargets.get(user.id) === targetUserId) {
      return ack({ ok: true, unchanged: true });
    }
    lobby.pendingEscortVisitTargets.set(user.id, targetUserId);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:bodyguardGuard', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Bodyguard') {
      return ack({ ok: false, error: 'Only Bodyguard can guard' });
    }
    if (targetUserId === user.id) {
      return ack({ ok: false, error: 'Bodyguard cannot target themselves' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }
    if (isRapidAction(lobby, user.id, 'bodyguardGuard')) {
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.pendingBodyguardGuardTargets) {
      lobby.pendingBodyguardGuardTargets = new Map();
    }
    if (lobby.pendingBodyguardGuardTargets.get(user.id) === targetUserId) {
      return ack({ ok: true, unchanged: true });
    }
    lobby.pendingBodyguardGuardTargets.set(user.id, targetUserId);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:doctorProtect', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Doctor') {
      return ack({ ok: false, error: 'Only Doctor can protect' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }
    if (isRapidAction(lobby, user.id, 'doctorProtect')) {
      return ack({ ok: true, throttled: true });
    }
    if (targetUserId === user.id) {
      const myRoleState = lobby.playerRoleState?.get(user.id) ?? {};
      if (myRoleState.doctorSelfProtectUsed === true) {
        return ack({ ok: false, error: 'Doctor can only self-protect once per game' });
      }
    }

    if (!lobby.pendingDoctorProtectTargets) {
      lobby.pendingDoctorProtectTargets = new Map();
    }
    if (lobby.pendingDoctorProtectTargets.get(user.id) === targetUserId) {
      return ack({ ok: true, unchanged: true });
    }
    lobby.pendingDoctorProtectTargets.set(user.id, targetUserId);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:trackerWatch', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Tracker') {
      return ack({ ok: false, error: 'Only Tracker can track' });
    }
    if (targetUserId === user.id) {
      return ack({ ok: false, error: 'Tracker cannot target themselves' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }
    if (isRapidAction(lobby, user.id, 'trackerWatch')) {
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.pendingTrackerWatchTargets) {
      lobby.pendingTrackerWatchTargets = new Map();
    }
    if (lobby.pendingTrackerWatchTargets.get(user.id) === targetUserId) {
      return ack({ ok: true, unchanged: true });
    }
    lobby.pendingTrackerWatchTargets.set(user.id, targetUserId);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:lookoutWatch', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Lookout') {
      return ack({ ok: false, error: 'Only Lookout can watch' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }
    if (isRapidAction(lobby, user.id, 'lookoutWatch')) {
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.pendingLookoutWatchTargets) {
      lobby.pendingLookoutWatchTargets = new Map();
    }
    if (lobby.pendingLookoutWatchTargets.get(user.id) === targetUserId) {
      return ack({ ok: true, unchanged: true });
    }
    lobby.pendingLookoutWatchTargets.set(user.id, targetUserId);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:investigate', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Investigator') {
      return ack({ ok: false, error: 'Only Investigator can investigate' });
    }
    if (targetUserId === user.id) {
      return ack({ ok: false, error: 'Investigator cannot target themselves' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }
    if (isRapidAction(lobby, user.id, 'investigate')) {
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.pendingInvestigatorVisitTargets) {
      lobby.pendingInvestigatorVisitTargets = new Map();
    }
    if (lobby.pendingInvestigatorVisitTargets.get(user.id) === targetUserId) {
      return ack({ ok: true, unchanged: true });
    }
    lobby.pendingInvestigatorVisitTargets.set(user.id, targetUserId);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:toggleTrapperAlert', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Trapper') {
      return ack({ ok: false, error: 'Only Trapper can alert' });
    }
    if (isRapidAction(lobby, user.id, 'toggleTrapperAlert')) {
      return ack({ ok: true, throttled: true });
    }
    const myRoleState = lobby.playerRoleState?.get(user.id);
    if ((myRoleState?.trapperAlertsRemaining ?? 0) <= 0) {
      return ack({ ok: false, error: 'No Trapper alerts remaining' });
    }
    if (!lobby.pendingTrapperAlertUserIds) {
      lobby.pendingTrapperAlertUserIds = new Set();
    }
    if (lobby.pendingTrapperAlertUserIds.has(user.id)) {
      return ack({ ok: false, error: 'Trapper alert already active for this night' });
    }

    myRoleState.trapperAlertsRemaining -= 1;
    lobby.playerRoleState?.set(user.id, myRoleState);
    lobby.pendingTrapperAlertUserIds.add(user.id);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:castVote', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'vote') {
      return ack({ ok: false, error: 'Not in voting phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot vote' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Votes can only target alive players' });
    }
    if (isRapidAction(lobby, user.id, 'castVote')) {
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.currentVotes) {
      lobby.currentVotes = new Map();
    }
    const currentSelection = lobby.currentVotes.get(user.id) ?? null;
    if (currentSelection === targetUserId) {
      lobby.currentVotes.delete(user.id);
      return ack({ ok: true, cleared: true });
    }
    lobby.currentVotes.set(user.id, targetUserId);
    return ack({ ok: true });
  });

  socket.on('game:updateNotebook', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const { notes } = data ?? {};
    if (typeof notes !== 'string') {
      return ack({ ok: false, error: 'Invalid notes' });
    }

    if (!lobby.playerNotebooks) {
      lobby.playerNotebooks = new Map();
    }
    lobby.playerNotebooks.set(user.id, notes.slice(0, 5000));
    return ack({ ok: true });
  });

  socket.on('game:setPlayerEliminated', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (lobby.hostUserId !== user.id) {
      return ack({ ok: false, error: 'Only host can update player status' });
    }

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    const { eliminated, cause } = data ?? {};
    if (!lobby.members.has(targetUserId)) {
      return ack({ ok: false, error: 'Target user is not in this lobby' });
    }

    if (!lobby.eliminatedUserIds) {
      lobby.eliminatedUserIds = new Set();
    }
    if (!lobby.publicEliminatedUserIds) {
      lobby.publicEliminatedUserIds = new Set();
    }
    if (!lobby.pendingNightDeathReveals) {
      lobby.pendingNightDeathReveals = [];
    }
    if (!lobby.playerNotebooks) {
      lobby.playerNotebooks = new Map();
    }

    if (eliminated === false) {
      lobby.eliminatedUserIds.delete(targetUserId);
      lobby.publicEliminatedUserIds.delete(targetUserId);
      if (cause === 'night') {
        lobby.pendingNightDeathReveals = lobby.pendingNightDeathReveals.filter(
          (entry) => entry.userId !== targetUserId,
        );
      }
    } else {
      lobby.eliminatedUserIds.add(targetUserId);
      if (cause === 'night') {
        convertExecutionersToJesterForNightDeaths(lobby, [targetUserId]);
        const addedReveal = addNightDeathReveal(lobby, targetUserId);
        if (!addedReveal) {
          const member = lobby.members.get(targetUserId);
          const existingIndex = lobby.pendingNightDeathReveals.findIndex(
            (entry) => entry.userId === targetUserId,
          );
          const revealEntry = {
            userId: targetUserId,
            name: member?.name ?? 'Unknown Player',
            notebook: lobby.playerNotebooks.get(targetUserId) ?? '',
          };
          if (existingIndex >= 0) {
            lobby.pendingNightDeathReveals[existingIndex] = revealEntry;
          } else {
            lobby.pendingNightDeathReveals.push(revealEntry);
          }
        }
      } else {
        lobby.publicEliminatedUserIds.add(targetUserId);
      }
    }

    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });
};
