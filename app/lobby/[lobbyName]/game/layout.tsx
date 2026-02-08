'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { socket } from '@/lib/socket';

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lobbyName } = useParams<{ lobbyName: string }>();
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace('/');
      return;
    }
    if (!lobbyName) return;

    if (!socket.connected) {
      socket.connect();
      const timeoutId = setTimeout(() => {
        if (!socket.connected) {
          router.replace('/');
        }
      }, 2000);
      return () => clearTimeout(timeoutId);
    }

    socket.emit('lobby:verify', { lobbyName }, (res: { ok: boolean }) => {
      if (!res?.ok) {
        router.replace('/');
      }
    });
  }, [lobbyName, router, status]);

  return <>{children}</>;
}
