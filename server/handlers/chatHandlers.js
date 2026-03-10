import {
  addChatMessage,
  buildChatStateForUser,
  canSendChatChannelMessage,
  emitChatMessage,
  parseChatChannel,
  sanitizeChatContent,
} from '../chatService.js';
import { requireAckAndLobby, requireLobbyMembership } from './shared.js';

const isRapidChat = (lobby, userId, channel, minIntervalMs = 500) => {
  if (!lobby.actionTimestamps) {
    lobby.actionTimestamps = new Map();
  }
  const key = `chat:${channel}:${userId}`;
  const now = Date.now();
  const lastAt = lobby.actionTimestamps.get(key) ?? 0;
  if (now - lastAt < minIntervalMs) {
    return true;
  }
  lobby.actionTimestamps.set(key, now);
  return false;
};

export const registerChatHandlers = ({ io, socket, user }) => {
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

    if (isRapidChat(lobby, user.id, channel)) {
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
