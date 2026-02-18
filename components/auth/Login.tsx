'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const credSignIn = async () => {
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    const code = res?.code ?? null;

    if (code === 'NO_USER') {
      setErrorMessage('No account found. Please sign up.');
      return;
    }
    if (code === 'BAD_PASSWORD') {
      setErrorMessage('Incorrect password.');
      return;
    }
    if (code === 'MISSING_FIELDS') {
      setErrorMessage('Please enter email and password.');
      return;
    }

    if (res?.error) {
      setErrorMessage('Sign in failed.');
      return;
    }

    // success
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="game-card">
        <div className="game-card-glow">
          <h1 className="game-title mb-10">Welcome</h1>

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
              <span className="game-section-title">
                or
              </span>
              <div className="h-px flex-1 bg-slate-700/70" />
            </div>

            {/* Credentials */}
            <div className="space-y-5">
              <p className="text-center text-slate-300">
                Sign in with email
              </p>
              {errorMessage && (
                <div className="game-box border-red-500/30 bg-red-500/10">
                  <span className="text-red-200 text-sm">
                    {errorMessage}
                  </span>
                </div>
              )}

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
                  onClick={credSignIn}
                  className="game-button-primary"
                >
                  Sign In
                </button>
              </div>
              <div className="space-y-3 text-center">
                <Link href="/signup" className="game-link">
                  Create New Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
