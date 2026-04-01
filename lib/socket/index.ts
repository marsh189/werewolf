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

socket.on('connect', () => {
  console.info('[socket] connected', {
    id: socket.id,
    transport: socket.io.engine.transport.name,
  });
});

socket.on('connect_error', (error) => {
  const socketError = error as Error & {
    description?: unknown;
    context?: unknown;
    type?: string;
  };
  console.error('[socket] connect_error', {
    message: socketError.message,
    description: socketError.description ?? null,
    context: socketError.context ?? null,
    type: socketError.type ?? null,
  });
});

socket.on('disconnect', (reason, details) => {
  const disconnectDetails = details as
    | {
        description?: unknown;
        context?: unknown;
      }
    | undefined;
  console.warn('[socket] disconnected', {
    reason,
    description: disconnectDetails?.description ?? null,
    context: disconnectDetails?.context ?? null,
  });
});
