/* =============================================================================
   Validators / Sanitizers (Server)

   Small helpers for parsing untrusted socket payloads.
   Keep these strict and predictable: return `null` on invalid input.
============================================================================= */

export const parseLobbyNameInput = (data) => {
  const value =
    typeof data === 'string'
      ? data
      : data && typeof data === 'object'
        ? data.lobbyName
        : null;
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (!name) return null;

  // Route params may arrive URL-encoded (e.g. "My%20Lobby"). If a client ever
  // double-encodes the lobby name (e.g. "My%2520Lobby"), decode twice so we
  // still resolve the in-memory lobby key consistently.
  let next = name;
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

  const decodedTrimmed = next.trim();
  return decodedTrimmed || null;
};

export const parseTargetUserId = (data) => {
  const value = data?.targetUserId;
  if (typeof value !== 'string') return null;
  const targetUserId = value.trim();
  return targetUserId || null;
};

export const sanitizeWerewolfCount = (input, min = 1) =>
  Math.max(min, Number(input) || min);

export const sanitizeSpecialRolesEnabled = (input) => input === true;

export const sanitizeNeutralRolesEnabled = (input) => input === true;

export const sanitizePhaseDurations = (phaseDurations, minSeconds = 10) => {
  if (!phaseDurations || typeof phaseDurations !== 'object') return null;

  const sanitizeSeconds = (value) =>
    Math.max(minSeconds, Number(value) || minSeconds);

  const daySeconds = sanitizeSeconds(phaseDurations.daySeconds);
  const nightSeconds = sanitizeSeconds(phaseDurations.nightSeconds);
  const voteSeconds = sanitizeSeconds(phaseDurations.voteSeconds);
  return { daySeconds, nightSeconds, voteSeconds };
};
