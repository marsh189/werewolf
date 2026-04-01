import { schedulePhaseTransition } from './gamePhaseUtils.js';
import { emitLobbyUpdate } from '../lobbyEmitService.js';
import { getFactionForRole, isWerewolfRole } from './rolesService.js';

/* =============================================================================
   Game Results + Win Conditions

   Extracted from `lobbyService.js` so the phase engine can stay focused on
   transitions and action resolution.
============================================================================= */

const END_GAME_PHASE_DURATION_MS = 7 * 1000;

const buildGameStats = (players, roleByUserId) => ({
  totalPlayers: players.length,
  survivingPlayers: players.filter((player) => player.alive).length,
  totalDeaths: players.filter((player) => !player.alive).length,
  villagePlayers: players.filter((player) => getFactionForRole(roleByUserId.get(player.userId) ?? null) === 'Village').length,
  enemyPlayers: players.filter((player) => getFactionForRole(roleByUserId.get(player.userId) ?? null) === 'Enemy').length,
  neutralPlayers: players.filter((player) => getFactionForRole(roleByUserId.get(player.userId) ?? null) === 'Neutral').length,
});

export const getAliveWerewolfIds = (lobby, aliveAtNightStart) =>
  Array.from(lobby.playerRoles.entries())
    .filter(
      ([userId, role]) =>
        isWerewolfRole(role) &&
        aliveAtNightStart.has(userId) &&
        !lobby.eliminatedUserIds.has(userId),
    )
    .map(([userId]) => userId);

const buildGameResultsSnapshot = (lobby, winningFaction) => {
  const players = Array.from(lobby.members.values()).map((member) => {
    const actualRole = lobby.playerRoles?.get(member.userId) ?? null;
    const alive = !lobby.eliminatedUserIds?.has(member.userId);
    const shouldRevealRole = alive || lobby.roleRevealOnElimination !== false;
    const eliminationSummary =
      lobby.eliminationInfoByUserId?.get(member.userId)?.summary ?? null;
    return {
      userId: member.userId,
      name: member.name,
      role: shouldRevealRole ? actualRole : null,
      faction: shouldRevealRole ? getFactionForRole(actualRole) : null,
      alive,
      eliminationSummary,
    };
  });
  return {
    winningFaction: winningFaction ?? 'Village',
    endedAt: Date.now(),
    stats: buildGameStats(players, lobby.playerRoles ?? new Map()),
    players,
    timeline: Array.isArray(lobby.roundRecapEvents) ? [...lobby.roundRecapEvents] : [],
  };
};

const getAliveWerewolfCount = (lobby) =>
  Array.from(lobby.playerRoles?.entries() ?? []).filter(
    ([userId, role]) =>
      lobby.members?.has(userId) &&
      !lobby.eliminatedUserIds?.has(userId) &&
      isWerewolfRole(role),
  ).length;

const getAliveNonEnemyCount = (lobby) =>
  Array.from(lobby.playerRoles?.entries() ?? []).filter(
    ([userId, role]) =>
      lobby.members?.has(userId) &&
      !lobby.eliminatedUserIds?.has(userId) &&
      getFactionForRole(role) !== 'Enemy',
  ).length;

const startVictoryPhase = (io, lobby, winningFaction) => {
  if (lobby.gameResults) return;
  lobby.gamePhase = 'endGame';
  lobby.currentNightDeathReveal = null;
  lobby.currentEliminationResult = null;
  lobby.gameResults = buildGameResultsSnapshot(lobby, winningFaction);

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
  startVictoryPhase(io, lobby, 'Village');
  return true;
};

export const maybeTriggerWerewolfWin = (io, lobby) => {
  if (!lobby?.started) return false;
  if (lobby.gameResults) return false;
  if (lobby.gamePhase === 'endGame' || lobby.gamePhase === 'gameResults') return false;

  const aliveWerewolfCount = getAliveWerewolfCount(lobby);
  const aliveNonEnemyCount = getAliveNonEnemyCount(lobby);

  if (aliveWerewolfCount <= 0) return false;
  if (aliveWerewolfCount < aliveNonEnemyCount) return false;

  startVictoryPhase(io, lobby, 'Enemy');
  return true;
};

export const maybeTriggerNeutralWinByVote = (io, lobby, votedOutUserId) => {
  if (!lobby?.started) return false;
  if (lobby.gameResults) return false;
  if (lobby.gamePhase === 'endGame' || lobby.gamePhase === 'gameResults') return false;
  if (!votedOutUserId) return false;

  const votedOutRole = lobby.playerRoles?.get(votedOutUserId) ?? null;
  if (votedOutRole === 'Jester') {
    startVictoryPhase(io, lobby, 'Jester');
    return true;
  }

  const executionerIds = Array.from(lobby.playerRoles?.entries() ?? [])
    .filter(([, role]) => role === 'Executioner')
    .map(([userId]) => userId);

  for (const executionerUserId of executionerIds) {
    const roleState = lobby.playerRoleState?.get(executionerUserId) ?? null;
    const targetUserId = roleState?.executionerTargetUserId ?? null;
    if (targetUserId && targetUserId === votedOutUserId) {
      startVictoryPhase(io, lobby, 'Executioner');
      return true;
    }
  }

  return false;
};
