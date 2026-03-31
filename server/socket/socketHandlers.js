import { registerChatHandlers } from './handlers/chatHandlers.js';
import { registerGameHandlers } from './handlers/gameHandlers.js';
import { registerLobbyHandlers } from './handlers/lobbyHandlers.js';
import { logInfo } from '../logger.js';

export const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    const user = socket.data.user;
    logInfo('socket_connected', {
      socketId: socket.id,
      userId: user?.id ?? null,
      email: user?.email ?? null,
    });

    registerLobbyHandlers({ io, socket, user });
    registerGameHandlers({ io, socket, user });
    registerChatHandlers({ io, socket, user });
  });
};
