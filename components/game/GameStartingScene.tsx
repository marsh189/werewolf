'use client';

/* =============================================================================
   Game Starting Scene

   Full-screen "Game begins soon" screen shown while the lobby is started but the
   game is still in the `lobby` phase with a countdown (`startingAt`).
============================================================================= */

export default function GameStartingScene({
  startingRemainingSeconds,
}: {
  startingRemainingSeconds: number | null;
}) {
  return (
    <div className="game-cinematic-scene min-h-[100svh] flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
      <div className="w-full max-w-3xl text-center space-y-4">
        <p className="game-tight-label">Starting</p>
        <h1 className="game-title">Game begins soon</h1>
        <p className="text-slate-300 text-sm">
          {startingRemainingSeconds !== null
            ? `Starting in ${startingRemainingSeconds}s...`
            : 'Preparing the lobby...'}
        </p>
      </div>
    </div>
  );
}

