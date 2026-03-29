import { buildLobbyInfo, getLobbies } from './lobbyInfoService.js';
import { SERVER_EVENTS } from '../socket/events.js';

/* =============================================================================
   Lobby Emits (Server)

   Centralizes socket emissions for lobby updates and lobby lists.
============================================================================= */

export const emitLobbyUpdate = (io, lobby) => {
  io.to(lobby.name).emit(SERVER_EVENTS.LOBBY_UPDATE, buildLobbyInfo(lobby));
};

export const emitLobbiesList = (io) => {
  io.emit(SERVER_EVENTS.LOBBIES_LIST, getLobbies());
};
