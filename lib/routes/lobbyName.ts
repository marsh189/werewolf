/* =============================================================================
   Lobby Name Normalization (Client)

   Next.js route params are usually decoded, but in practice we can still see
   URL-encoded lobby names (or even double-encoded names) depending on how a
   user navigated (copy/paste, redirects, manual edits).

   If the client emits the wrong lobby key (ex: "My%2520Lobby"), the server will
   fail to find the lobby and return "Lobby does not exist".

   This helper gives pages/hooks a single, predictable way to derive the
   canonical lobby key from a route param.
============================================================================= */

export const normalizeLobbyNameParam = (value?: string) => {
  if (typeof value !== 'string') return undefined;

  let next = value;

  // Guard against double-encoding (ex: "%2520" -> "%20" -> " ").
  for (let i = 0; i < 2; i++) {
    if (!next.includes('%')) break;
    try {
      const decoded = decodeURIComponent(next);
      if (decoded === next) break;
      next = decoded;
    } catch {
      break;
    }
  }

  const trimmed = next.trim();
  return trimmed || undefined;
};

