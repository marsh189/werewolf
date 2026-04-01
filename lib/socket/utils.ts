'use client';

import { socket } from '@/lib/socket';
import { SOCKET_ACK_TIMEOUT_MS } from '@/lib/socket/constants';

/* =============================================================================
   Socket Utilities (Client)

   Keep "connect if needed" logic in one place so pages/components don't repeat:
   `if (!socket.connected) socket.connect()`.
============================================================================= */

/* ---------------------------------------------------------------------------
   connectSocketIfNeeded()

   Ensures a socket connection exists before emitting events.
   Safe to call repeatedly (no-op when already connected).
--------------------------------------------------------------------------- */
export const connectSocketIfNeeded = () => {
  if (!socket.connected) socket.connect();
};

export const waitForSocketConnection = (
  timeoutMs = SOCKET_ACK_TIMEOUT_MS,
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }

    connectSocketIfNeeded();

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    };

    const onConnect = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Socket connection timed out.'));
    }, timeoutMs);

    socket.on('connect', onConnect);
    socket.on('connect_error', onError);
  });
