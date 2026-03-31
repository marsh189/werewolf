import { DEFAULT_PHASE_DURATIONS } from '../state/constants.js';
import { getLobbyEntries } from '../state/state.js';

/* =============================================================================
   Lobby Info (Server)

   Builds the public lobby payloads sent to clients. Keep this separate from the
   game loop so emitters and handlers can depend on it without pulling in the
   full `lobbyService` phase engine.
============================================================================= */

export const buildLobbyInfo = (lobby) => {
  const voteTally = new Map();
  for (const targetUserId of lobby.currentVotes?.values?.() ?? []) {
    voteTally.set(targetUserId, (voteTally.get(targetUserId) ?? 0) + 1);
  }

  return {
    lobbyName: lobby.name,
    hostUserId: lobby.hostUserId,
    members: Array.from(lobby.members.values()).map((m) => ({
      userId: m.userId,
      name: m.name,
      alive: !lobby.publicEliminatedUserIds?.has(m.userId),
      voteCount: voteTally.get(m.userId) ?? 0,
    })),
    started: lobby.started,
    startingAt: lobby.startingAt,
    werewolfCount: lobby.werewolfCount ?? 1,
    specialRolesEnabled: lobby.specialRolesEnabled === true,
    neutralRolesEnabled: lobby.neutralRolesEnabled === true,
    roleRevealOnElimination: lobby.roleRevealOnElimination !== false,
    phaseDurations: lobby.phaseDurations ?? { ...DEFAULT_PHASE_DURATIONS },
    gamePhase: lobby.gamePhase ?? 'lobby',
    dayNumber: lobby.dayNumber ?? null,
    nightNumber: lobby.nightNumber ?? null,
    phaseEndsAt: lobby.phaseEndsAt ?? null,
    currentNightDeathReveal: lobby.currentNightDeathReveal ?? null,
    currentEliminationResult: lobby.currentEliminationResult ?? null,
    gameResults: lobby.gameResults ?? null,
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
