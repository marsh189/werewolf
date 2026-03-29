import { CLIENT_EVENTS } from '../../events.js';
import { emitLobbyUpdate, isRapidAction } from '../../../services/index.js';
import {
  requireAckAndLobby,
  requireAliveActor,
  requireAliveTargetMember,
  requireGamePhase,
  requireLobbyMembership,
  requireTargetUserId,
} from '../shared.js';
import { registerNightKillHandler } from './nightActions/nightKillHandler.js';
import { registerTargetToggleHandlers } from './nightActions/targetToggleHandlers.js';
import { registerTrapperAlertHandler } from './nightActions/trapperAlertHandler.js';

/* =============================================================================
   Game Handlers: Night Actions
============================================================================= */

export const registerNightActionHandlers = ({ io, socket, user }) => {
  /* ---------------------------------------------------------------------------
     Night Actions (Module Registration)

     This file stays intentionally small: it wires up night-action modules.
     Each module owns its own detailed logic + comments.
  --------------------------------------------------------------------------- */

  const common = {
    io,
    socket,
    user,
    CLIENT_EVENTS,
    emitLobbyUpdate,
    isRapidAction,
    requireAckAndLobby,
    requireAliveActor,
    requireAliveTargetMember,
    requireGamePhase,
    requireLobbyMembership,
    requireTargetUserId,
  };

  registerNightKillHandler(common);
  registerTargetToggleHandlers(common);
  registerTrapperAlertHandler(common);
};
