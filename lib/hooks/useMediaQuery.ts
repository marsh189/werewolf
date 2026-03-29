'use client';

import { useEffect, useState } from 'react';

/* =============================================================================
   useMediaQuery(query)

   SSR-safe `matchMedia` wrapper used for responsive client-only UI logic.

   Notes:
   - Returns `fallback` during SSR / before hydration.
   - Subscribes to the browser's media query "change" event.
============================================================================= */

/* ---------------------------------------------------------------------------
   useMediaQuery(query, fallback)

   Small helper for responsive UI without duplicating `matchMedia` listeners.
--------------------------------------------------------------------------- */
export function useMediaQuery(query: string, fallback = false) {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return fallback;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    media.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
    };
  }, [query]);

  return matches;
}
