'use client';

import { socket } from '@/lib/socket';
import type { LobbyView } from '@/models/lobby';
import { connectSocketIfNeeded } from '@/lib/socket/utils';
import { useEffect, useState } from 'react';

type InitiateLobbyAck =
  | { ok: true; lobbyInfo: LobbyView }
  | { ok: false; error?: string };

/* ---------------------------------------------------------------------------
   useLobbyRealtime(lobbyName)

   Subscribes to server-driven lobby state so pages can render live membership,
   settings, and phase updates without polling.
--------------------------------------------------------------------------- */
export function useLobbyRealtime(lobbyName?: string) {
  const [lobbyInfo, setLobbyInfo] = useState<LobbyView | null>(null);

  useEffect(() => {
    if (!lobbyName) return;

    /* -------------------------------------------------------------------------
       Realtime Lobby State

       - `initiateLobby` returns the full current snapshot (reconnect-friendly)
       - `update` pushes snapshots as the server mutates the lobby
    ------------------------------------------------------------------------- */

    let active = true;

    connectSocketIfNeeded();

    const requestSnapshot = () => {
      socket.emit('initiateLobby', { lobbyName }, (response: InitiateLobbyAck) => {
        if (!active) return;

        if (!response?.ok) {
          // If the server restarted, in-memory lobbies are lost. Clear local state so
          // UI doesn't keep rendering stale lobby info.
          setLobbyInfo(null);
          return;
        }

        setLobbyInfo(response.lobbyInfo);
      });
    };

    // Initial snapshot (and used again on reconnect). Only emit once connected to
    // avoid queuing a snapshot request *and* also re-requesting on "connect".
    if (socket.connected) {
      requestSnapshot();
    }

    const onUpdate = (data: LobbyView) => {
      if (!active) return;
      setLobbyInfo(data);
    };

    /* -----------------------------------------------------------------------
       Reconnect Resilience

       When the socket reconnects (after a server restart or transient network
       issue), re-request the authoritative lobby snapshot.
    ----------------------------------------------------------------------- */
    socket.on('connect', requestSnapshot);

    /* -----------------------------------------------------------------------
       Server Push Subscription: `update`

       Payload: full `LobbyView` snapshot.
       Why: keeps lobby pages in sync without polling.
       Cleanup: remove listener on unmount / lobby change.
    ----------------------------------------------------------------------- */
    socket.on('update', onUpdate);

    return () => {
      active = false;
      socket.off('connect', requestSnapshot);
      socket.off('update', onUpdate);
    };
  }, [lobbyName]);

  return { lobbyInfo, setLobbyInfo };
}
