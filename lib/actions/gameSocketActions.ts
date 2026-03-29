'use client';

import { socket } from '@/lib/socket';
import { SOCKET_ACK_TIMEOUT_MS } from '@/lib/socket/constants';
import { connectSocketIfNeeded } from '@/lib/socket/utils';
import type {
  ChatChannel,
  ChatInitResponse,
  ChatSendResponse,
  GameInitResponse,
  NotebookResponse,
  SocketAck,
} from '@/models/game';

/* =============================================================================
   Client -> Server Socket Actions

   Thin wrapper functions around `socket.emit(...)` so UI components:
   - stay readable
   - don't repeat event name strings everywhere
   - can rely on `connectSocketIfNeeded()` automatically
============================================================================= */

/* ---------------------------------------------------------------------------
   emit(...)

   Internal helper that:
   - connects the socket if needed
   - forwards `socket.emit` with its full overload surface
--------------------------------------------------------------------------- */
const emit = (...args: Parameters<typeof socket.emit>) => {
  connectSocketIfNeeded();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (socket.emit as any)(...args);
};

/* ---------------------------------------------------------------------------
   initGame(lobbyName, callback)

   Requests the full authoritative game snapshot used to render the game UI.
--------------------------------------------------------------------------- */
export const initGame = (
  lobbyName: string,
  callback: (response: GameInitResponse) => void,
) => {
  emit('game:init', { lobbyName }, callback);
};

/* ---------------------------------------------------------------------------
   endGame(lobbyName, callback)

   Host-only request to end the current game immediately.
--------------------------------------------------------------------------- */
export const endGame = (
  lobbyName: string,
  callback: (err: unknown, res: SocketAck | undefined) => void,
) => {
  connectSocketIfNeeded();
  socket.timeout(SOCKET_ACK_TIMEOUT_MS).emit('endGame', { lobbyName }, callback);
};

/* ---------------------------------------------------------------------------
   Night Actions

   Fire-and-forget events (no ack) that record the player's selection for the
   current phase. The server validates permissions and timing.
--------------------------------------------------------------------------- */
export const nightKill = (lobbyName: string, targetUserId: string) => {
  emit('game:nightKill', { lobbyName, targetUserId });
};

export const toggleTrapperAlert = (lobbyName: string) => {
  emit('game:toggleTrapperAlert', { lobbyName });
};

export const escortVisit = (lobbyName: string, targetUserId: string) => {
  emit('game:escortVisit', { lobbyName, targetUserId });
};

export const bodyguardGuard = (lobbyName: string, targetUserId: string) => {
  emit('game:bodyguardGuard', { lobbyName, targetUserId });
};

export const doctorProtect = (lobbyName: string, targetUserId: string) => {
  emit('game:doctorProtect', { lobbyName, targetUserId });
};

export const trackerWatch = (lobbyName: string, targetUserId: string) => {
  emit('game:trackerWatch', { lobbyName, targetUserId });
};

export const lookoutWatch = (lobbyName: string, targetUserId: string) => {
  emit('game:lookoutWatch', { lobbyName, targetUserId });
};

export const investigate = (lobbyName: string, targetUserId: string) => {
  emit('game:investigate', { lobbyName, targetUserId });
};

export const frame = (lobbyName: string, targetUserId: string) => {
  emit('game:frame', { lobbyName, targetUserId });
};

export const prowl = (lobbyName: string, targetUserId: string) => {
  emit('game:prowl', { lobbyName, targetUserId });
};

export const snatch = (lobbyName: string, targetUserId: string) => {
  emit('game:snatch', { lobbyName, targetUserId });
};

export const curse = (lobbyName: string, targetUserId: string) => {
  emit('game:curse', { lobbyName, targetUserId });
};

export const mimic = (lobbyName: string, targetUserId: string) => {
  emit('game:mimic', { lobbyName, targetUserId });
};

export const castVote = (lobbyName: string, targetUserId: string) => {
  emit('game:castVote', { lobbyName, targetUserId });
};

/* ---------------------------------------------------------------------------
   Notebook

   Update and fetch player notes. The server decides whether notes are writable.
--------------------------------------------------------------------------- */
export const updateNotebook = (lobbyName: string, notes: string) => {
  emit('game:updateNotebook', { lobbyName, notes });
};

export const getNotebook = (
  lobbyName: string,
  targetUserId: string,
  callback: (response: NotebookResponse) => void,
) => {
  emit('game:getNotebook', { lobbyName, targetUserId }, callback);
};

/* ---------------------------------------------------------------------------
   Chat

   Initializes chat state and sends messages to the server, which determines:
   - which channels exist
   - whether the user can send
   - who can see each message (audience)
--------------------------------------------------------------------------- */
export const initChat = (
  lobbyName: string,
  callback: (response: ChatInitResponse) => void,
) => {
  emit('chat:init', { lobbyName }, callback);
};

export const sendChatMessage = (
  lobbyName: string,
  channel: ChatChannel,
  content: string,
  callback: (response: ChatSendResponse) => void,
) => {
  emit('chat:send', { lobbyName, channel, content }, callback);
};
