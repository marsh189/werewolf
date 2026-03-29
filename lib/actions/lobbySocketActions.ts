'use client';

import { socket } from '@/lib/socket';
import { connectSocketIfNeeded } from '@/lib/socket/utils';
import type {
  CreateAck,
  JoinAck,
  LobbyListItem,
  LobbySettingsUpdate,
  ListAck,
} from '@/models/lobby';
import type { SocketAck } from '@/models/game';
import { SOCKET_ACK_TIMEOUT_MS } from '@/lib/socket/constants';

/* =============================================================================
   Client -> Server Lobby Socket Actions

   These helpers keep UI components readable by centralizing:
   - event name strings (ex: 'joinLobby')
   - connection safety via `connectSocketIfNeeded()`
   - consistent timeout defaults for request/ack events
============================================================================= */

/* ---------------------------------------------------------------------------
   Shared Defaults

   Most lobby actions are request/ack style events. We use the shared
   `SOCKET_ACK_TIMEOUT_MS` so components don't each pick their own value.
--------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------
   Request Open Lobbies

   Asks the server for the current list of lobbies. The server may also push
   lobby list updates separately; this is just the "fetch now" action.
------------------------------------------------------------------------- */
export const requestLobbiesList = (
  callback: (err: unknown, res: ListAck<LobbyListItem> | undefined) => void,
) => {
  connectSocketIfNeeded();
  socket.timeout(SOCKET_ACK_TIMEOUT_MS).emit('lobbiesList', {}, callback);
};

/* -------------------------------------------------------------------------
   Join Lobby By Name

   Attempts to join the lobby and returns the final lobby name via ack.
------------------------------------------------------------------------- */
export const joinLobby = (
  lobbyName: string,
  callback: (err: unknown, res: JoinAck | undefined) => void,
) => {
  connectSocketIfNeeded();
  socket.timeout(SOCKET_ACK_TIMEOUT_MS).emit('joinLobby', { lobbyName }, callback);
};

/* -------------------------------------------------------------------------
   Create Lobby

   Creates a new lobby. The server may normalize the name; the ack returns the
   canonical lobby name to navigate to.
------------------------------------------------------------------------- */
export const createLobby = (
  lobbyName: string,
  callback: (err: unknown, res: CreateAck | undefined) => void,
) => {
  connectSocketIfNeeded();
  socket.timeout(SOCKET_ACK_TIMEOUT_MS).emit('createLobby', { lobbyName }, callback);
};

/* -------------------------------------------------------------------------
   Leave Lobby

   Best-effort event (no ack). The UI typically navigates away immediately,
   and the server cleans up membership.
------------------------------------------------------------------------- */
export const leaveLobby = (lobbyName: string) => {
  connectSocketIfNeeded();
  socket.emit('leaveLobby', { lobbyName });
};

/* -------------------------------------------------------------------------
   Start Game (Host Only)

   Tells the server to begin the game for the lobby. The server is the source
   of truth for countdown/state; clients transition based on realtime updates.
------------------------------------------------------------------------- */
export const startGame = (
  lobbyName: string,
  callback: (err: unknown, res: SocketAck | undefined) => void,
) => {
  connectSocketIfNeeded();
  socket.timeout(SOCKET_ACK_TIMEOUT_MS).emit('startGame', { lobbyName }, callback);
};

/* -------------------------------------------------------------------------
   Update Lobby Settings (Host Only)

   Sends a full settings payload (werewolves/role toggles/timers). We keep this
   centralized so pages don't re-implement the ack/error pattern.
------------------------------------------------------------------------- */
export const updateLobbySettings = (
  lobbyName: string,
  next: LobbySettingsUpdate,
  callback: (err: unknown, res: SocketAck | undefined) => void,
) => {
  connectSocketIfNeeded();
  socket
    .timeout(SOCKET_ACK_TIMEOUT_MS)
    .emit('lobby:updateSettings', { lobbyName, ...next }, callback);
};
