import { registerGameAdminHandlers } from './game/adminHandlers.js';
import { registerGameInitHandlers } from './game/initHandlers.js';
import { registerNightActionHandlers } from './game/nightActionHandlers.js';
import { registerNotebookHandlers } from './game/notebookHandlers.js';
import { registerVoteHandlers } from './game/voteHandlers.js';

/* =============================================================================
   Game Handlers

   Socket events that mutate game state.

   Split into focused modules to keep each concern readable:
   - init + notebook read
   - night actions
   - voting
   - notebook write
   - host/admin tools
============================================================================= */

export const registerGameHandlers = ({ io, socket, user }) => {
  registerGameInitHandlers({ socket, user });
  registerNightActionHandlers({ io, socket, user });
  registerVoteHandlers({ socket, user });
  registerNotebookHandlers({ socket, user });
  registerGameAdminHandlers({ io, socket, user });
};

