export const DEFAULT_PHASE_DURATIONS = {
  daySeconds: 60,
  nightSeconds: 60,
  voteSeconds: 30,
};

export const START_COUNTDOWN_MS = 5000;

const ROLE_TITLE_LEAD_MS = 1000;
const ROLE_REVEAL_HOLD_MS = 3000;
const ROLE_REVEAL_FADE_MS = 700;

export const ROLE_REVEAL_TOTAL_MS =
  ROLE_TITLE_LEAD_MS + ROLE_REVEAL_HOLD_MS + ROLE_REVEAL_FADE_MS;
