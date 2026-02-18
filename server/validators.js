export const parseLobbyNameInput = (data) => {
  const value =
    typeof data === 'string'
      ? data
      : data && typeof data === 'object'
        ? data.lobbyName
        : null;
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name || null;
};

export const parseTargetUserId = (data) => {
  const value = data?.targetUserId;
  if (typeof value !== 'string') return null;
  const targetUserId = value.trim();
  return targetUserId || null;
};

export const sanitizeWerewolfCount = (input) =>
  Math.max(1, Number(input) || 1);

export const sanitizeExtraRoles = (roles) => {
  if (!Array.isArray(roles)) return [];
  return Array.from(new Set(roles.filter((role) => typeof role === 'string')));
};

export const sanitizePhaseDurations = (phaseDurations, minSeconds = 10) => {
  if (!phaseDurations || typeof phaseDurations !== 'object') return null;
  const daySeconds = Math.max(
    minSeconds,
    Number(phaseDurations.daySeconds) || minSeconds,
  );
  const nightSeconds = Math.max(
    minSeconds,
    Number(phaseDurations.nightSeconds) || minSeconds,
  );
  const voteSeconds = Math.max(
    minSeconds,
    Number(phaseDurations.voteSeconds) || minSeconds,
  );
  return { daySeconds, nightSeconds, voteSeconds };
};
