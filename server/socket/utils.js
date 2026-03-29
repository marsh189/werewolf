import { parseLobbyNameInput } from '../validation/validators.js';

/* =============================================================================
   Socket Utilities

   Small helpers used by socket event handlers.
============================================================================= */

export const getAck = (callback) =>
  typeof callback === 'function' ? callback : () => {};

export const parseLobbyName = (data) => parseLobbyNameInput(data);

