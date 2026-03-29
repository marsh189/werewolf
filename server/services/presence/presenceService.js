import { getLobby, getUserLobby } from '../../state/state.js';
import { endGameForLobby } from '../lobbyService.js';
import { emitLobbyUpdate } from '../lobbyEmitService.js';

/* =============================================================================
   In-Game Presence Tracking

   Tracks whether a socket is actively viewing `lobby`, `game`, or `results`.
   This is used to:
   - Keep a rough "who is currently in-game" counter per lobby
   - Auto-reset an ended game when nobody is viewing game/results anymore
============================================================================= */

export const updateInGamePresence = (lobby, userId, delta) => {
  if (!lobby?.inGameUserCounts) {
    lobby.inGameUserCounts = new Map();
  }

  const next = Math.max(0, (lobby.inGameUserCounts.get(userId) ?? 0) + delta);
  if (next === 0) {
    lobby.inGameUserCounts.delete(userId);
  } else {
    lobby.inGameUserCounts.set(userId, next);
  }
};

export const getTotalInGameCount = (lobby) =>
  Array.from(lobby?.inGameUserCounts?.values?.() ?? []).reduce(
    (sum, n) => sum + (Number(n) || 0),
    0,
  );

export const maybeAutoResetEndedGame = (io, lobby) => {
  if (!lobby) return;
  if (lobby.gamePhase !== 'gameResults') return;
  if (getTotalInGameCount(lobby) !== 0) return;
  endGameForLobby(io, lobby);
};

export const setSocketViewPresence = ({ io, socket, userId, lobbyName, view }) => {
  const lobby = getLobby(lobbyName);
  if (!lobby) return { ok: false, error: 'Lobby does not exist' };

  const current = getUserLobby(userId) ?? null;
  const isMember = lobby.members.has(userId);
  if (!isMember && current !== lobbyName) {
    return { ok: false, error: 'User has not joined this lobby' };
  }

  const previous = socket.data?.viewPresence ?? null;
  const previousLobbyName = previous?.lobbyName ?? null;
  const previousView = previous?.view ?? null;

  // Fast path: if the client re-sends the same state (common in dev Strict Mode),
  // treat it as a no-op to avoid extra lobby update spam.
  if (previousLobbyName === lobbyName && previousView === view) {
    return { ok: true };
  }

  const wasInGame = previousView === 'game' || previousView === 'results';
  const nowInGame = view === 'game' || view === 'results';

  // If we're staying inside the same lobby, we can apply the delta once and emit once.
  if (previousLobbyName === lobbyName) {
    const delta = wasInGame === nowInGame ? 0 : nowInGame ? 1 : -1;
    socket.data.viewPresence = { lobbyName, view };

    if (delta !== 0) {
      updateInGamePresence(lobby, userId, delta);
    }

    maybeAutoResetEndedGame(io, lobby);
    emitLobbyUpdate(io, lobby);
    return { ok: true };
  }

  if (previousLobbyName && wasInGame) {
    const previousLobby = getLobby(previousLobbyName);
    if (previousLobby) {
      updateInGamePresence(previousLobby, userId, -1);
      maybeAutoResetEndedGame(io, previousLobby);
      emitLobbyUpdate(io, previousLobby);
    }
  }

  socket.data.viewPresence = { lobbyName, view };

  if (nowInGame) {
    updateInGamePresence(lobby, userId, 1);
  }

  maybeAutoResetEndedGame(io, lobby);
  emitLobbyUpdate(io, lobby);
  return { ok: true };
};

export const handleInGamePresenceDisconnect = ({ io, socket, userId }) => {
  const previous = socket.data?.viewPresence ?? null;
  const previousLobbyName = previous?.lobbyName ?? null;
  const previousView = previous?.view ?? null;
  const wasInGame = previousView === 'game' || previousView === 'results';
  if (!previousLobbyName || !wasInGame) return;

  const previousLobby = getLobby(previousLobbyName);
  if (!previousLobby) return;

  updateInGamePresence(previousLobby, userId, -1);
  maybeAutoResetEndedGame(io, previousLobby);
  emitLobbyUpdate(io, previousLobby);
};
