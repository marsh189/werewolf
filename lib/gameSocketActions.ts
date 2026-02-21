'use client';

import { socket } from '@/lib/socket';
import type {
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
