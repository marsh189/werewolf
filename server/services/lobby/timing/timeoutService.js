/* =============================================================================
   Lobby Timeout Service

   Centralizes cleanup for any active timers attached to a lobby.
   This prevents "dangling" transitions when a game ends or a lobby is deleted.
============================================================================= */

export const clearLobbyTimeouts = (lobby) => {
  if (lobby.startTimeoutId) {
    clearTimeout(lobby.startTimeoutId);
    lobby.startTimeoutId = null;
  }
  if (lobby.revealTimeoutId) {
    clearTimeout(lobby.revealTimeoutId);
    lobby.revealTimeoutId = null;
  }
  if (lobby.phaseTimeoutId) {
    clearTimeout(lobby.phaseTimeoutId);
    lobby.phaseTimeoutId = null;
  }
};

