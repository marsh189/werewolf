'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';

export function LobbyGuard({ children }: { children: React.ReactNode }) {
  const { lobbyName } = useParams<{ lobbyName: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!lobbyName) return;

    // Ensure socket is connected (don’t redirect if not yet)
    if (!socket.connected) socket.connect();

    socket.emit('lobby:verify', { lobbyName }, (res: { ok: boolean }) => {
      if (!res.ok) {
        router.replace('/');
      }
    });
  }, [lobbyName, router]);

  return <>{children}</>;
}
