import {
  addTargetedSystemChatMessage,
  emitChatMessage,
} from '../../chatService.js';

/* =============================================================================
   Night Resolution: Notices

   Central place for emitting private/system messages that explain night results.
============================================================================= */

export const emitNightActionNotice = (
  io,
  lobby,
  recipientUserIds,
  content,
  audience = 'private',
  tone = 'death',
) => {
  if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) return;
  const message = addTargetedSystemChatMessage(lobby, {
    audience,
    content,
    recipientUserIds,
    tone,
  });
  emitChatMessage(io, lobby, message);
};

