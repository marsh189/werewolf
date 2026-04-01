import { DAY_ZERO_DURATION_MS } from '../../../../state/constants.js';
import { emitLobbyUpdate } from '../../../lobbyEmitService.js';
import { schedulePhaseTransition } from '../../../game/gamePhaseUtils.js';

/* =============================================================================
   Lobby Phase Engine: Day

   Day is the "discussion" phase.
   Day 0 is a special shorter intro phase.
============================================================================= */

export const createDayPhases = ({ getStartNightPhase, getStartVotePhase }) => {
  const startDayPhase = (io, lobby, dayNumber) => {
    lobby.gamePhase = 'day';
    lobby.dayNumber = dayNumber;
    const durationMs =
      dayNumber === 0
        ? DAY_ZERO_DURATION_MS
        : (lobby.phaseDurations?.daySeconds ?? 30) * 1000;

    schedulePhaseTransition(
      io,
      lobby,
      durationMs,
      () => {
        if (dayNumber === 0) {
          getStartNightPhase()(io, lobby, 1);
        } else {
          getStartVotePhase()(io, lobby);
        }
      },
    );

    emitLobbyUpdate(io, lobby);
  };

  return { startDayPhase };
};
