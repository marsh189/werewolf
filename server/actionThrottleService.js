/* =============================================================================
   Action Throttling

   Socket events are easy to spam (double-clicks, reconnect loops, bad clients).
   This helper stores lightweight per-lobby timestamps to throttle high-frequency
   actions without needing a database.
============================================================================= */

export const isRapidAction = (lobby, userId, actionKey, minIntervalMs = 250) => {
  if (!lobby.actionTimestamps) {
    lobby.actionTimestamps = new Map();
  }

  const key = `${actionKey}:${userId}`;
  const now = Date.now();
  const lastAt = lobby.actionTimestamps.get(key) ?? 0;
  if (now - lastAt < minIntervalMs) {
    return true;
  }

  lobby.actionTimestamps.set(key, now);
  return false;
};

