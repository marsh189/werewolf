'use client';

import { io } from 'socket.io-client';

/* =============================================================================
   Socket.IO Client

   Default behavior is to connect to the same origin (recommended for deployments).
   You can override via `NEXT_PUBLIC_SOCKET_URL` for local/remote testing.
============================================================================= */

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

/* ---------------------------------------------------------------------------
   socket

   Shared Socket.IO client instance used across the app.
   `autoConnect: false` so we can connect only after a session exists.
--------------------------------------------------------------------------- */
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
});
