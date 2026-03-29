/* =============================================================================
   Storage Keys

   Small helpers to keep `localStorage` key naming consistent.
============================================================================= */

export const STORAGE_KEY_PREFIX = 'werewolf';

/* ---------------------------------------------------------------------------
   getNotebookStorageKey(lobbyName, userId)

   Per-user, per-lobby notebook persistence key.
--------------------------------------------------------------------------- */
export const getNotebookStorageKey = (lobbyName: string, userId: string) =>
  `${STORAGE_KEY_PREFIX}:notebook:${lobbyName}:${userId}`;
