import { registerGameHandlers } from './handlers/gameHandlers.js';
import { registerLobbyHandlers } from './handlers/lobbyHandlers.js';

export const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log('connected:', socket.id, 'user:', user);

    registerLobbyHandlers({ io, socket, user });
    registerGameHandlers({ io, socket, user });
  });
};
