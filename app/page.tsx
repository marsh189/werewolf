'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <p>Loading...</p>;
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Werewolf Game</h1>

      {!session ? (
        <>
          <p>You are not signed in</p>
          <button onClick={() => signIn('github')}>Sign in with GitHub</button>
        </>
      ) : (
        <>
          <p>Signed in as {session.user?.name}</p>
          <button onClick={() => signOut()}>Sign out</button>

          <div style={{ marginTop: 16 }}>
            <Link href="/game/test-room">Join Game</Link>
          </div>
        </>
      )}
    </main>
  );
}
