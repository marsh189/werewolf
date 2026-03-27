import {
  addChatMessage,
  buildChatStateForUser,
  canSendChatChannelMessage,
  emitChatMessage,
  parseChatChannel,
  sanitizeChatContent,
} from '../chatService.js';
import { isRapidAction } from '../actionThrottleService.js';
import { requireAckAndLobby, requireLobbyMembership } from './shared.js';

export const registerChatHandlers = ({ io, socket, user }) => {
  /* =============================================================================
     Chat Handlers

     Socket events for initializing chat state and sending messages.
  ============================================================================= */

  socket.on('chat:init', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    return ack({
      ok: true,
      chat: buildChatStateForUser(lobby, user.id),
    });
  });

  socket.on('chat:send', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const channel = parseChatChannel(data?.channel);
    if (!channel) {
      return ack({ ok: false, error: 'Invalid chat channel' });
    }

    const content = sanitizeChatContent(data?.content);
    if (!content) {
      return ack({ ok: false, error: 'Invalid message' });
    }

    if (!canSendChatChannelMessage(lobby, user.id, channel)) {
      return ack({ ok: false, error: 'Chat is unavailable for that channel right now' });
    }

    if (isRapidAction(lobby, user.id, `chat:${channel}`, 500)) {
      return ack({ ok: true, throttled: true });
    }

    const message = addChatMessage(lobby, {
      channel,
      userId: user.id,
      name: user.name ?? 'Player',
      content,
    });

    emitChatMessage(io, lobby, message);
    return ack({ ok: true, message });
  });
};
