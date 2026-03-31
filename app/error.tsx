'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main>
      <div className="min-h-[100svh] flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
        <div className="w-full max-w-lg game-card">
          <div className="game-card-glow space-y-6">
            <h1 className="game-title">Something went wrong</h1>
            <p className="text-slate-300 text-sm">
              Try again. If this keeps happening, refresh the page.
            </p>

            <div className="space-y-3">
              <button type="button" className="game-button-primary" onClick={reset}>
                Retry
              </button>
              <Link href="/" className="game-link block text-center">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

