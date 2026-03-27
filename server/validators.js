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

  // Route params may arrive URL-encoded (e.g. "My%20Lobby"); normalize to
  // the canonical lobby key while preserving raw names if decoding fails.
  if (!name.includes('%')) return name;
  try {
    const decoded = decodeURIComponent(name).trim();
    return decoded || null;
  } catch {
    return name;
  }
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
