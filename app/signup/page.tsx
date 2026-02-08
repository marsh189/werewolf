'use client';

import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignUp() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1) Create user
      const r = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok || !data.ok) {
        if (data.error === 'EMAIL_TAKEN')
          setErrorMessage('Email already in use.');
        else if (data.error === 'MISSING_FIELDS')
          setErrorMessage('Please fill out all fields.');
        else setErrorMessage('Signup failed.');
        setIsSubmitting(false);
        return;
      }

      // 2) Auto sign-in
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMessage('Account created, but sign-in failed.');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      router.push('/');
      router.refresh();
    } catch {
      setErrorMessage('Network error. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <main>
      <Navbar />

      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg game-card">
          <div className="game-card-glow">
            <h1 className="game-title mb-10">Create Account</h1>

            <form className="space-y-8" onSubmit={onSubmit}>
              {errorMessage && (
                <div className="game-box border-red-500/30 bg-red-500/10">
                  <span className="text-red-200 text-sm">{errorMessage}</span>
                </div>
              )}

              <div className="space-y-3">
                <label className="game-label">Name</label>
                <input
                  className="game-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..."
                  autoComplete="name"
                />
              </div>

              <div className="space-y-3">
                <label className="game-label">Email</label>
                <input
                  className="game-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email..."
                  autoComplete="email"
                />
              </div>

              <div className="space-y-3">
                <label className="game-label">Password</label>
                <input
                  className="game-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password..."
                  autoComplete="new-password"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="game-button-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>

            <div className="mt-10 text-center">
              <Link href="/" className="game-link">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
