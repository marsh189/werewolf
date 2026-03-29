'use client';

import { socket } from '@/lib/socket';

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
