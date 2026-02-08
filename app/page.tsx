'use client';

import LobbySelect from '@/components/LobbySelect';
import Login from '@/components/Login';
import Navbar from '@/components/Navbar';
import { socket } from '@/lib/socket';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;

    if (!socket.connected) socket.connect();

    socket.on('connect', () => {
      console.log('✅ socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ connect_error:', err.message);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
    };
  }, [session]);

  return (
    <main>
      <Navbar />
      {!session ? <Login /> : <LobbySelect />}
    </main>
  );
}
