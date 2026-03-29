'use client';

import Login from '@/components/auth/Login';
import LobbySelect from '@/components/lobby/LobbySelect';
import Navbar from '@/components/shared/Navbar';
import { connectSocketIfNeeded } from '@/lib/socket/utils';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;

    /* -----------------------------------------------------------------------
       Ensure the realtime socket is ready as soon as the user is logged in.

       Lobby list updates and many UI flows assume the socket is connected.
    ----------------------------------------------------------------------- */

    connectSocketIfNeeded();
  }, [session]);

  return (
    <main>
      <Navbar />
      {!session ? <Login /> : <LobbySelect />}
    </main>
  );
}
