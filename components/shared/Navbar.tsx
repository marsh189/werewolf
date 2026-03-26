'use client';

import { signOut, useSession } from 'next-auth/react';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="w-full px-4 py-4 sm:px-6 sm:py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="game-title text-left leading-tight">
        Nightfall in the Village
      </h1>

      {session ? (
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-6 sm:mr-6 min-w-0">
          <span className="text-slate-200 font-semibold truncate min-w-0">
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
