'use client';

import { socket } from '@/lib/socket';
import type {
  ChatChannel,
  ChatInitResponse,
  ChatSendResponse,
  GameInitResponse,
  NotebookResponse,
  SocketAck,
} from '@/models/game';

export const initGame = (
  lobbyName: string,
  callback: (response: GameInitResponse) => void,
) => {
  socket.emit('game:init', { lobbyName }, callback);
};

export const endGame = (
  lobbyName: string,
  callback: (err: unknown, res: SocketAck | undefined) => void,
) => {
  socket.timeout(5000).emit('endGame', { lobbyName }, callback);
};

export const nightKill = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:nightKill', { lobbyName, targetUserId });
};

export const toggleTrapperAlert = (lobbyName: string) => {
  socket.emit('game:toggleTrapperAlert', { lobbyName });
};

export const escortVisit = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:escortVisit', { lobbyName, targetUserId });
};

export const bodyguardGuard = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:bodyguardGuard', { lobbyName, targetUserId });
};

export const doctorProtect = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:doctorProtect', { lobbyName, targetUserId });
};

export const trackerWatch = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:trackerWatch', { lobbyName, targetUserId });
};

export const lookoutWatch = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:lookoutWatch', { lobbyName, targetUserId });
};

export const investigate = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:investigate', { lobbyName, targetUserId });
};

export const frame = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:frame', { lobbyName, targetUserId });
};

export const prowl = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:prowl', { lobbyName, targetUserId });
};

export const snatch = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:snatch', { lobbyName, targetUserId });
};

export const curse = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:curse', { lobbyName, targetUserId });
};

export const mimic = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:mimic', { lobbyName, targetUserId });
};

export const castVote = (lobbyName: string, targetUserId: string) => {
  socket.emit('game:castVote', { lobbyName, targetUserId });
};

export const updateNotebook = (lobbyName: string, notes: string) => {
  socket.emit('game:updateNotebook', { lobbyName, notes });
};

export const getNotebook = (
  lobbyName: string,
  targetUserId: string,
  callback: (response: NotebookResponse) => void,
) => {
  socket.emit('game:getNotebook', { lobbyName, targetUserId }, callback);
};

export const initChat = (
  lobbyName: string,
  callback: (response: ChatInitResponse) => void,
) => {
  socket.emit('chat:init', { lobbyName }, callback);
};

export const sendChatMessage = (
  lobbyName: string,
  channel: ChatChannel,
  content: string,
  callback: (response: ChatSendResponse) => void,
) => {
  socket.emit('chat:send', { lobbyName, channel, content }, callback);
};
