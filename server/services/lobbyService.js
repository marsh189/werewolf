/* =============================================================================
   Lobby Service (Facade)

   This file intentionally stays small.

   The original monolithic `lobbyService.js` has been split into focused modules
   under `server/services/lobby/` so that:
   - phase logic is easy to scan
   - membership logic is easy to audit
   - reset/timeout helpers are easy to reuse safely

   Keeping this file as a facade avoids churn in imports across the codebase.
============================================================================= */

export * from './lobby/index.js';

