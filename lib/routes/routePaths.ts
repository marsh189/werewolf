/* =============================================================================
   Route Path Helpers

   Small helpers for building internal app routes consistently.
   Centralizes `encodeURIComponent` so it isn't repeated across pages/hooks.
============================================================================= */

/* ---------------------------------------------------------------------------
   Lobby Routes
--------------------------------------------------------------------------- */
/* ---------------------------------------------------------------------------
   lobbyPath(lobbyName)

   Base lobby route for a given lobby name.
--------------------------------------------------------------------------- */
export const lobbyPath = (lobbyName: string) =>
  `/lobby/${encodeURIComponent(lobbyName)}`;

/* ---------------------------------------------------------------------------
   gamePath(lobbyName)

   Game route for a given lobby.
--------------------------------------------------------------------------- */
export const gamePath = (lobbyName: string) => `${lobbyPath(lobbyName)}/game`;

/* ---------------------------------------------------------------------------
   resultsPath(lobbyName)

   Results route for a given lobby.
--------------------------------------------------------------------------- */
export const resultsPath = (lobbyName: string) =>
  `${lobbyPath(lobbyName)}/results`;
