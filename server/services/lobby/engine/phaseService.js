import { createDayPhases } from './day/dayPhases.js';
import { createNightPhases } from './night/nightPhases.js';
import { createVotePhases } from './vote/votePhases.js';

/* =============================================================================
   Lobby Phase Engine (Composition Root)

   This file wires the day/night/vote modules together into a single phase
   engine with stable public exports.

   Why this exists:
   - keeps cross-phase dependencies explicit
   - avoids circular imports between day/night/vote modules
============================================================================= */

let startDayPhaseImpl = null;
let startNightPhaseImpl = null;
let startVotePhaseImpl = null;

const getStartDayPhase = () => startDayPhaseImpl;
const getStartNightPhase = () => startNightPhaseImpl;
const getStartVotePhase = () => startVotePhaseImpl;

const { startNightPhase } = createNightPhases({ getStartDayPhase });
const { startVotePhase } = createVotePhases({ getStartNightPhase });
const { startDayPhase: startDayPhaseFn } = createDayPhases({
  getStartNightPhase,
  getStartVotePhase,
});

startDayPhaseImpl = startDayPhaseFn;
startNightPhaseImpl = startNightPhase;
startVotePhaseImpl = startVotePhase;

// Keep the original name for external callers (lifecycleService, etc.).
export const startDayPhase = startDayPhaseFn;
