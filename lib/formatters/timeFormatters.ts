/* =============================================================================
   Time Formatters

   Small, pure helpers so UI code doesn't re-implement:
   - "remaining seconds" rounding/clamping rules
   - `m:ss` formatting
============================================================================= */

/* ---------------------------------------------------------------------------
   getRemainingSecondsCeil(endsAtMs, nowMs)

   Converts two millisecond timestamps into a non-negative remaining seconds
   count. Uses `ceil` so "0.1s remaining" still displays as "1".
--------------------------------------------------------------------------- */
export const getRemainingSecondsCeil = (endsAtMs: number, nowMs: number) =>
  Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));

/* ---------------------------------------------------------------------------
   formatMinutesSeconds(totalSeconds)

   Formats as `m:ss` with a clamped non-negative input.
--------------------------------------------------------------------------- */
export const formatMinutesSeconds = (totalSeconds: number) => {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/* ---------------------------------------------------------------------------
   formatChatTimestamp(sentAtMs)

   Converts a message timestamp into a short local time (ex: "9:41 PM").
--------------------------------------------------------------------------- */
export const formatChatTimestamp = (sentAtMs: number) =>
  new Date(sentAtMs).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
