'use client';

import { socket } from '@/lib/socket';
import type { LobbyView } from '@/models/lobby';
import { useEffect, useState } from 'react';

type InitiateLobbyAck =
  | { ok: true; lobbyInfo: LobbyView }
  | { ok: false; error?: string };

export function useLobbyRealtime(lobbyName?: string) {
  const [lobbyInfo, setLobbyInfo] = useState<LobbyView | null>(null);

  useEffect(() => {
    if (!lobbyName) return;

    let active = true;

    socket.emit('initiateLobby', { lobbyName }, (response: InitiateLobbyAck) => {
      if (!active || !response.ok) return;
      setLobbyInfo(response.lobbyInfo);
    });

    const onUpdate = (data: LobbyView) => {
      if (!active) return;
      setLobbyInfo(data);
    };

    socket.on('update', onUpdate);

    return () => {
      active = false;
      socket.off('update', onUpdate);
    };
  }, [lobbyName]);

  return { lobbyInfo, setLobbyInfo };
}
