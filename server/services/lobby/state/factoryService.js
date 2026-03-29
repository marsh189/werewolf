import { DEFAULT_PHASE_DURATIONS } from '../../../state/constants.js';
import { resetGameState } from './resetService.js';

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
    name: user.name ?? 'Player',
    socketId,
    joinedAt: Date.now(),
  };
};
