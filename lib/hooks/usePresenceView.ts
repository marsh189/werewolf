'use client';

import { useEffect } from 'react';
import { socket } from '@/lib/socket';
import { connectSocketIfNeeded } from '@/lib/socket/utils';

/* =============================================================================
   Presence View Hook

   The server tracks whether a user is actively viewing:
   - `lobby`
   - `game`
   - `results`

   This is used for:
   - in-game presence counters
   - auto-resetting ended games when nobody is viewing them
============================================================================= */

/* ---------------------------------------------------------------------------
   usePresenceView(lobbyName, view)

   Tells the server which screen the user is actively viewing for a lobby.
   The server treats this as a state update (idempotent).
--------------------------------------------------------------------------- */
export function usePresenceView(lobbyName: string | undefined, view: 'lobby' | 'game' | 'results') {
  useEffect(() => {
    if (!lobbyName) return;

    connectSocketIfNeeded();

    // Idempotent: the server treats this as a state update (not a "do once" action).
    socket.emit('presence:setView', { lobbyName, view });
  }, [lobbyName, view]);
}
