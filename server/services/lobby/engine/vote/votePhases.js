import { ELIMINATION_RESULTS_DURATION_MS } from '../../../../state/constants.js';
import { emitLobbyUpdate } from '../../../lobbyEmitService.js';
import { setEliminationInfo } from '../../../game/eliminationService.js';
import {
  maybeTriggerNeutralWinByVote,
  maybeTriggerVillageWin,
} from '../../../game/gameResultsService.js';
import { schedulePhaseTransition } from '../../../game/gamePhaseUtils.js';

/* =============================================================================
   Lobby Phase Engine: Vote

   Vote is the "daytime elimination" mechanic:
   - clients write votes into a Map (voterId -> targetId)
   - when the timer ends we tally and (if no tie) eliminate the top target
============================================================================= */

export const createVotePhases = ({ getStartNightPhase }) => {
  const resolveVoteTally = (votesByVoterId) => {
    const tally = new Map();
    for (const targetId of votesByVoterId.values()) {
      tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
    }

    let topTargetId = null;
    let topVotes = 0;
    let tie = false;
    for (const [targetId, count] of tally.entries()) {
      if (count > topVotes) {
        topVotes = count;
        topTargetId = targetId;
        tie = false;
      } else if (count === topVotes) {
        tie = true;
      }
    }

    return { topTargetId, topVotes, tie };
  };

  const startEliminationResultsPhase = (io, lobby) => {
    lobby.gamePhase = 'eliminationResults';
    lobby.currentNightDeathReveal = null;
    schedulePhaseTransition(io, lobby, ELIMINATION_RESULTS_DURATION_MS, () => {
      const votedOutUserId =
        lobby.currentEliminationResult && !lobby.currentEliminationResult.noElimination
          ? lobby.currentEliminationResult.userId
          : null;
      lobby.currentEliminationResult = null;
      if (maybeTriggerNeutralWinByVote(io, lobby, votedOutUserId)) return;
      if (maybeTriggerVillageWin(io, lobby)) return;
      getStartNightPhase()(io, lobby, (lobby.nightNumber ?? 0) + 1);
    });
    emitLobbyUpdate(io, lobby);
  };

  const startVotePhase = (io, lobby) => {
    lobby.gamePhase = 'vote';
    lobby.currentVotes = new Map();
    schedulePhaseTransition(
      io,
      lobby,
      (lobby.phaseDurations?.voteSeconds ?? 10) * 1000,
      () => {
        const { topTargetId, topVotes, tie } = resolveVoteTally(lobby.currentVotes);

        if (
          !tie &&
          topTargetId &&
          lobby.members.has(topTargetId) &&
          !lobby.eliminatedUserIds.has(topTargetId)
        ) {
          lobby.eliminatedUserIds.add(topTargetId);
          setEliminationInfo(lobby, topTargetId, {
            kind: 'vote',
            summary: 'Voted out by the village.',
          });
          if (!lobby.publicEliminatedUserIds) {
            lobby.publicEliminatedUserIds = new Set();
          }
          lobby.publicEliminatedUserIds.add(topTargetId);
          const member = lobby.members.get(topTargetId);
          lobby.currentEliminationResult = {
            userId: topTargetId,
            name: member?.name ?? 'Unknown Player',
            notebook: lobby.playerNotebooks?.get(topTargetId) ?? '',
            voteCount: topVotes,
            noElimination: false,
          };
        } else {
          lobby.currentEliminationResult = {
            noElimination: true,
          };
        }

        startEliminationResultsPhase(io, lobby);
      },
    );
    emitLobbyUpdate(io, lobby);
  };

  return {
    startVotePhase,
  };
};
