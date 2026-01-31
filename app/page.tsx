'use client';

import Title from '@/components/Title';
import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function HomePage() {
  const { data: session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main>
      <Title />

      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="game-card">
          <div className="game-card-glow">
            <h1 className="game-title mb-10">
              {!session ? 'Welcome' : 'Home'}
            </h1>

            {!session ? (
              <div className="space-y-10">
                {/* OAuth */}
                <div className="space-y-4">
                  <p className="text-center text-slate-300">
                    Sign in to create or join a lobby
                  </p>

                  <button
                    type="button"
                    onClick={() => signIn('google')}
                    className="game-button-primary"
                  >
                    Sign in with Google
                  </button>

                  <button
                    type="button"
                    onClick={() => signIn('github')}
                    className="game-button-primary"
                  >
                    Sign in with GitHub
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-700/70" />
                  <span className="text-xs uppercase tracking-widest text-slate-400">
                    or
                  </span>
                  <div className="h-px flex-1 bg-slate-700/70" />
                </div>

                {/* Credentials */}
                <div className="space-y-5">
                  <p className="text-center text-slate-300">
                    Sign in with email
                  </p>

                  <div className="space-y-3">
                    <label className="game-label">Email</label>
                    <input
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="game-input"
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="game-label">Password</label>
                    <input
                      placeholder="••••••••"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="game-input"
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        signIn('credentials', {
                          email,
                          password,
                          redirect: false,
                        })
                      }
                      className="game-button-primary"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Signed in info */}
                <div className="space-y-2 text-center">
                  <p className="text-slate-300">Signed in as</p>
                  <p className="text-white font-semibold">
                    {session.user?.name ?? session.user?.email}
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <Link
                    href="/lobby/join"
                    className="game-button-primary text-center block"
                  >
                    Join Lobby
                  </Link>

                  <Link
                    href="/lobby/create"
                    className="game-button-primary text-center block"
                  >
                    Create New Lobby
                  </Link>
                </div>

                {/* Sign out */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="w-full py-4 rounded-xl font-bold text-white bg-slate-800/70 border border-slate-700 hover:bg-slate-800 transition shadow-xl"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
