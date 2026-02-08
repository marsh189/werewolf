'use client';

import { signOut, useSession } from 'next-auth/react';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="w-full px-6 py-6 flex items-center justify-between">
      <h1 className="game-title text-left">Nightfall in the Village</h1>

      {session ? (
        <div className="flex items-center gap-10 mr-6">
          <span className="text-slate-200 font-semibold">
            {session.user?.name ?? session.user?.email}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="sign-out-button"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </header>
  );
}
