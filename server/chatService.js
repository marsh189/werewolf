const CHAT_HISTORY_LIMIT = 60;
const CHAT_MESSAGE_MAX_LENGTH = 300;

export const CHAT_CHANNELS = {
  village: 'village',
};

const CHAT_CHANNEL_SET = new Set(Object.values(CHAT_CHANNELS));

const CHAT_AUDIENCES = {
  village: 'village',
  werewolf: 'werewolf',
  dead: 'dead',
  private: 'private',
};

const DAY_CHAT_PHASES = new Set(['day', 'vote', 'eliminationResults']);
const VILLAGE_CHAT_VISIBLE_PHASES = new Set([
  'day',
  'night',
  'nightActionResults',
  'vote',
  'eliminationResults',
]);

const ensureChatState = (lobby) => {
  if (!lobby.chatMessages) {
    lobby.chatMessages = {
      [CHAT_CHANNELS.village]: [],
    };
  }
  return lobby.chatMessages;
};

export const resetLobbyChat = (lobby) => {
  lobby.chatMessages = {
    [CHAT_CHANNELS.village]: [],
  };
};

export const parseChatChannel = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return CHAT_CHANNEL_SET.has(normalized) ? normalized : null;
};

export const sanitizeChatContent = (value) => {
  if (typeof value !== 'string') return null;
  const collapsed = value.replace(/\r\n/g, '\n').trim();
  if (!collapsed) return null;
  return collapsed.slice(0, CHAT_MESSAGE_MAX_LENGTH);
};

const isAlive = (lobby, userId) => !lobby.eliminatedUserIds?.has(userId);

const isAliveWerewolf = (lobby, userId) =>
  isAlive(lobby, userId) && lobby.playerRoles?.get(userId) === 'Werewolf';

const getChatAudienceForUser = (lobby, userId) => {
  if (!lobby.members.has(userId) || lobby.started !== true) return null;
  if (lobby.gamePhase === 'nightActionResults') return null;

  if (!isAlive(lobby, userId)) {
    return CHAT_AUDIENCES.dead;
  }

  if (isAliveWerewolf(lobby, userId) && lobby.gamePhase === 'night') {
    return CHAT_AUDIENCES.werewolf;
  }

  if (DAY_CHAT_PHASES.has(lobby.gamePhase)) {
    return CHAT_AUDIENCES.village;
  }

  return null;
};

export const canViewChatChannel = (lobby, userId, channel) => {
  if (!lobby.members.has(userId)) return false;

  if (channel === CHAT_CHANNELS.village) {
    return (
      lobby.started === true &&
      ((!isAlive(lobby, userId)) ||
        (isAlive(lobby, userId) && VILLAGE_CHAT_VISIBLE_PHASES.has(lobby.gamePhase)))
    );
  }

  return false;
};

export const canSendChatChannelMessage = (lobby, userId, channel) => {
  if (!lobby.members.has(userId)) return false;

  if (channel === CHAT_CHANNELS.village) {
    return getChatAudienceForUser(lobby, userId) !== null;
  }

  return false;
};

const canUserSeeMessage = (lobby, userId, message) => {
  if (!lobby.members.has(userId)) return false;
  if (Array.isArray(message.recipientUserIds) && message.recipientUserIds.length > 0) {
    return message.recipientUserIds.includes(userId);
  }
  if (message.audience === CHAT_AUDIENCES.village) {
    return canViewChatChannel(lobby, userId, CHAT_CHANNELS.village);
  }
  if (message.audience === CHAT_AUDIENCES.werewolf) {
    return isAliveWerewolf(lobby, userId);
  }
  if (message.audience === CHAT_AUDIENCES.dead) {
    return !isAlive(lobby, userId);
  }
  return false;
};

export const getVisibleChatChannels = (lobby, userId) =>
  Object.values(CHAT_CHANNELS).filter((channel) =>
    canViewChatChannel(lobby, userId, channel),
  );

export const buildChatStateForUser = (lobby, userId) => {
  const chatMessages = ensureChatState(lobby);
  const channels = getVisibleChatChannels(lobby, userId);
  const history = Object.fromEntries(
    channels.map((channel) => [
      channel,
      [...(chatMessages[channel] ?? [])].filter((message) =>
        canUserSeeMessage(lobby, userId, message),
      ),
    ]),
  );

  return {
    channels,
    canSend: Object.fromEntries(
      channels.map((channel) => [channel, canSendChatChannelMessage(lobby, userId, channel)]),
    ),
    history,
  };
};

export const syncLobbyChatRooms = () => {};

export const addChatMessage = (lobby, { channel, userId, name, content }) => {
  const chatMessages = ensureChatState(lobby);
  const audience = getChatAudienceForUser(lobby, userId);
  const nextMessage = {
    id: `${Date.now()}-${userId}-${Math.random().toString(36).slice(2, 8)}`,
    channel,
    audience,
    userId,
    name,
    content,
    sentAt: Date.now(),
  };

  const channelMessages = chatMessages[channel] ?? [];
  channelMessages.push(nextMessage);
  if (channelMessages.length > CHAT_HISTORY_LIMIT) {
    channelMessages.splice(0, channelMessages.length - CHAT_HISTORY_LIMIT);
  }
  chatMessages[channel] = channelMessages;

  return nextMessage;
};

export const addSystemChatMessage = (lobby, { content, audience, tone = 'default' }) => {
  return addTargetedSystemChatMessage(lobby, { content, audience, tone });
};

export const addTargetedSystemChatMessage = (
  lobby,
  { content, audience, recipientUserIds = [], tone = 'default' },
) => {
  const chatMessages = ensureChatState(lobby);
  const nextMessage = {
    id: `${Date.now()}-system-${Math.random().toString(36).slice(2, 8)}`,
    channel: CHAT_CHANNELS.village,
    audience,
    recipientUserIds,
    tone,
    userId: 'system',
    name: 'Server',
    content: content.slice(0, CHAT_MESSAGE_MAX_LENGTH),
    sentAt: Date.now(),
  };

  const channelMessages = chatMessages[CHAT_CHANNELS.village] ?? [];
  channelMessages.push(nextMessage);
  if (channelMessages.length > CHAT_HISTORY_LIMIT) {
    channelMessages.splice(0, channelMessages.length - CHAT_HISTORY_LIMIT);
  }
  chatMessages[CHAT_CHANNELS.village] = channelMessages;

  return nextMessage;
};

export const emitChatMessage = (io, lobby, message) => {
  for (const member of lobby.members.values()) {
    if (!member.socketId) continue;
    if (!canUserSeeMessage(lobby, member.userId, message)) continue;
    io.to(member.socketId).emit('chat:message', message);
  }
};
