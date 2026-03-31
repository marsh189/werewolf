import { DEFAULT_PHASE_DURATIONS } from '../../../state/constants.js';
import { resetGameState } from './resetService.js';

export const getDefaultLobbyDisplayName = (name) => {
  if (typeof name !== 'string') return 'Player';
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (!normalized) return 'Player';
  return normalized.split(' ')[0] || 'Player';
};

/* =============================================================================
   Lobby Factory

   Creates the in-memory lobby object.

   The lobby object is the server's source of truth and is stored in:
   - `server/state/state.js` (in-memory maps)
============================================================================= */

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
    roleRevealOnElimination: true,
    phaseDurations: { ...DEFAULT_PHASE_DURATIONS },
    gamePhase: 'lobby',
    revealTimeoutId: null,
    phaseTimeoutId: null,
    inGameUserCounts: new Map(),
    members: new Map(),
  };

  // Initialize all Maps/Sets so handlers can safely write to them.
  resetGameState(lobby, { resetPlayers: true });
  return lobby;
};

export const createMember = (user, socketId) => {
  return {
    userId: user.id,
    name: getDefaultLobbyDisplayName(user.name),
    socketId,
    joinedAt: Date.now(),
  };
};
