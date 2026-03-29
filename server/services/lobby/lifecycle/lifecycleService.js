import {
  ROLE_REVEAL_TOTAL_MS,
  START_COUNTDOWN_MS,
} from '../../../state/constants.js';
import { emitLobbiesList, emitLobbyUpdate } from '../../lobbyEmitService.js';
import { assignRolesToLobby } from '../../game/roleAssignmentService.js';
import { clearRoundState, resetGameState } from '../state/resetService.js';
import { clearLobbyTimeouts } from '../timing/timeoutService.js';
import { startDayPhase } from '../engine/phaseService.js';

/* =============================================================================
   Lobby Lifecycle

   Higher-level "game lifecycle" operations:
   - starting a game (countdown -> role reveal -> day 0)
   - ending a game (clear timers + reset state)
============================================================================= */

export const scheduleGameStart = (io, lobby) => {
  const startingAt = Date.now() + START_COUNTDOWN_MS;
  lobby.startingAt = startingAt;

  // Make sure pending state from a previous run cannot leak into the new game.
  clearRoundState(lobby);
  lobby.eliminatedUserIds = new Set();
  lobby.publicEliminatedUserIds = new Set();
  lobby.eliminationInfoByUserId = new Map();
  lobby.inGameUserCounts = new Map();

  if (lobby.startTimeoutId) clearTimeout(lobby.startTimeoutId);

  lobby.startTimeoutId = setTimeout(() => {
    assignRolesToLobby(lobby);

    lobby.started = true;
    lobby.startingAt = null;
    lobby.gamePhase = 'roleReveal';
    lobby.phaseEndsAt = Date.now() + ROLE_REVEAL_TOTAL_MS;

    if (lobby.revealTimeoutId) clearTimeout(lobby.revealTimeoutId);
    lobby.revealTimeoutId = setTimeout(() => {
      startDayPhase(io, lobby, 0);
    }, ROLE_REVEAL_TOTAL_MS);

    emitLobbyUpdate(io, lobby);
    emitLobbiesList(io);
  }, START_COUNTDOWN_MS);

  emitLobbyUpdate(io, lobby);
  emitLobbiesList(io);

  return startingAt;
};

export const endGameForLobby = (io, lobby) => {
  clearLobbyTimeouts(lobby);

  lobby.started = false;
  lobby.startingAt = null;
  lobby.gamePhase = 'lobby';

  resetGameState(lobby, { resetPlayers: true });

  emitLobbyUpdate(io, lobby);
  emitLobbiesList(io);
};
