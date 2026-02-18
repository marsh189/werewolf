'use client';

import Login from '@/components/auth/Login';
import LobbySelect from '@/components/lobby/LobbySelect';
import Navbar from '@/components/shared/Navbar';
import { socket } from '@/lib/socket';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;

    if (!socket.connected) socket.connect();

    const onConnect = () => {};
    const onConnectError = () => {};
    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
    };
  }, [session]);

  return (
    <main>
      <Navbar />
      {!session ? <Login /> : <LobbySelect />}
    </main>
  );
}
