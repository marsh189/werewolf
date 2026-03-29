import { schedulePhaseTransition } from './gamePhaseUtils.js';
import { emitLobbyUpdate } from '../lobbyEmitService.js';
import { getFactionForRole, isWerewolfRole } from './rolesService.js';

/* =============================================================================
   Game Results + Win Conditions

   Extracted from `lobbyService.js` so the phase engine can stay focused on
   transitions and action resolution.
============================================================================= */

const END_GAME_PHASE_DURATION_MS = 10 * 1000;

export const getAliveWerewolfIds = (lobby, aliveAtNightStart) =>
  Array.from(lobby.playerRoles.entries())
    .filter(
      ([userId, role]) =>
        isWerewolfRole(role) &&
        aliveAtNightStart.has(userId) &&
        !lobby.eliminatedUserIds.has(userId),
    )
    .map(([userId]) => userId);

const buildGameResultsSnapshot = (lobby) => {
  const players = Array.from(lobby.members.values()).map((member) => {
    const role = lobby.playerRoles?.get(member.userId) ?? null;
    const eliminationSummary =
      lobby.eliminationInfoByUserId?.get(member.userId)?.summary ?? null;
    return {
      userId: member.userId,
      name: member.name,
      role,
      faction: getFactionForRole(role),
      alive: !lobby.eliminatedUserIds?.has(member.userId),
      eliminationSummary,
    };
  });
  return {
    winningFaction: 'Village',
    endedAt: Date.now(),
    players,
  };
};

const getAliveWerewolfCount = (lobby) =>
  Array.from(lobby.playerRoles?.entries() ?? []).filter(
    ([userId, role]) =>
      lobby.members?.has(userId) &&
      !lobby.eliminatedUserIds?.has(userId) &&
      isWerewolfRole(role),
  ).length;

const startVillageVictoryPhase = (io, lobby) => {
  if (lobby.gameResults) return;
  lobby.gamePhase = 'endGame';
  lobby.currentNightDeathReveal = null;
  lobby.currentEliminationResult = null;
  lobby.gameResults = buildGameResultsSnapshot(lobby);

  schedulePhaseTransition(io, lobby, END_GAME_PHASE_DURATION_MS, () => {
    lobby.gamePhase = 'gameResults';
    lobby.phaseEndsAt = null;
    emitLobbyUpdate(io, lobby);
  });
  emitLobbyUpdate(io, lobby);
};

export const maybeTriggerVillageWin = (io, lobby) => {
  if (!lobby?.started) return false;
  if (lobby.gameResults) return false;
  if (lobby.gamePhase === 'endGame' || lobby.gamePhase === 'gameResults') return false;
  if (getAliveWerewolfCount(lobby) !== 0) return false;
  startVillageVictoryPhase(io, lobby);
  return true;
};
