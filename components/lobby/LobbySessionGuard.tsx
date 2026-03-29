'use client';

import { socket } from '@/lib/socket';
import { connectSocketIfNeeded } from '@/lib/socket/utils';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/* =============================================================================
   Lobby Session Guard

   Runs in lobby route layouts and enforces:
   - user is authenticated
   - socket is connected
   - lobby exists + user is allowed to view it (`lobby:verify`)

   This keeps page components focused on UI, not access control.
============================================================================= */

export function LobbySessionGuard({ children }: { children: React.ReactNode }) {
  const { lobbyName } = useParams<{ lobbyName: string }>();
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    /* -------------------------------------------------------------------------
       Auth gate
    ------------------------------------------------------------------------- */

    if (status === 'unauthenticated') {
      router.replace('/');
      return;
    }

    /* -------------------------------------------------------------------------
       Lobby gate
    ------------------------------------------------------------------------- */

    if (!lobbyName) return;

    connectSocketIfNeeded();

    const verifyLobby = () => {
      socket.emit('lobby:verify', { lobbyName }, (res: { ok: boolean }) => {
        if (!res?.ok) {
          router.replace('/');
        }
      });
    };

    // Fast-fail if the socket can't connect in a reasonable time.
    const timeoutId = setTimeout(() => {
      if (!socket.connected) {
        router.replace('/');
      }
    }, 2000);

    // Initial verify + re-verify on reconnect (server restarts wipe in-memory state).
    verifyLobby();
    socket.on('connect', verifyLobby);

    return () => {
      clearTimeout(timeoutId);
      socket.off('connect', verifyLobby);
    };
  }, [lobbyName, router, status]);

  return <>{children}</>;
}
