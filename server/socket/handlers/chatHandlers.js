import {
  addChatMessage,
  buildChatStateForUser,
  canSendChatChannelMessage,
  emitChatMessage,
  isRapidAction,
  parseChatChannel,
  sanitizeChatContent,
} from '../../services/index.js';
import { CLIENT_EVENTS } from '../events.js';
import { logInfo, logWarn } from '../../logger.js';
import { requireAckAndLobby, requireLobbyMembership } from './shared.js';

export const registerChatHandlers = ({ io, socket, user }) => {
  /* =============================================================================
     Chat Handlers

     Socket events for initializing chat state and sending messages.
  ============================================================================= */

  socket.on(CLIENT_EVENTS.CHAT_INIT, (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    return ack({
      ok: true,
      chat: buildChatStateForUser(lobby, user.id),
    });
  });

  socket.on(CLIENT_EVENTS.CHAT_SEND, (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const channel = parseChatChannel(data?.channel);
    if (!channel) {
      logWarn('chat_send_denied', {
        userId: user.id,
        lobbyName: lobby.name,
        reason: 'Invalid chat channel',
      });
      return ack({ ok: false, error: 'Invalid chat channel' });
    }

    const content = sanitizeChatContent(data?.content);
    if (!content) {
      logWarn('chat_send_denied', {
        userId: user.id,
        lobbyName: lobby.name,
        reason: 'Invalid message',
      });
      return ack({ ok: false, error: 'Invalid message' });
    }

    if (!canSendChatChannelMessage(lobby, user.id, channel)) {
      logWarn('chat_send_denied', {
        userId: user.id,
        lobbyName: lobby.name,
        channel,
        reason: 'Chat is unavailable for that channel right now',
      });
      return ack({ ok: false, error: 'Chat is unavailable for that channel right now' });
    }

    if (isRapidAction(lobby, user.id, `chat:${channel}`, 500)) {
      logInfo('chat_send_throttled', { userId: user.id, lobbyName: lobby.name, channel });
      return ack({ ok: true, throttled: true });
    }

    const message = addChatMessage(lobby, {
      channel,
      userId: user.id,
      name: lobby.members.get(user.id)?.name ?? user.name ?? 'Player',
      content,
    });

    emitChatMessage(io, lobby, message);
    logInfo('chat_send', {
      userId: user.id,
      lobbyName: lobby.name,
      channel,
      messageId: message.id,
    });
    return ack({ ok: true, message });
  });
};
