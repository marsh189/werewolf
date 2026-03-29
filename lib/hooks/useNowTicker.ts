'use client';

import { useEffect, useState } from 'react';

/* =============================================================================
   useNowTicker(enabled, intervalMs)

   Shared "local clock" hook used for countdown displays.

   Why:
   - Some UI elements need smooth countdown updates (ex: starting in N seconds).
   - We intentionally do NOT rely on server pushes for this (avoids spam).
============================================================================= */

/* ---------------------------------------------------------------------------
   Behavior

   - When `enabled` is false, the hook returns `null`.
   - When `enabled` is true, the hook returns `Date.now()` updated at `intervalMs`.
   - Uses timer callbacks (not synchronous setState-in-effect) for lint friendliness.
--------------------------------------------------------------------------- */
export function useNowTicker(enabled: boolean, intervalMs = 250) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      const resetId = setTimeout(() => {
        setNowMs(null);
      }, 0);
      return () => clearTimeout(resetId);
    }

    const kickoffId = setTimeout(() => {
      setNowMs(Date.now());
    }, 0);
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, intervalMs);

    return () => {
      clearTimeout(kickoffId);
      clearInterval(id);
    };
  }, [enabled, intervalMs]);

  return nowMs;
}
