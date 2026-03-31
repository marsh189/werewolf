import { ELIMINATION_RESULTS_DURATION_MS } from '../../../../state/constants.js';
import { emitLobbyUpdate } from '../../../lobbyEmitService.js';
import { setEliminationInfo } from '../../../game/eliminationService.js';
import {
  maybeTriggerNeutralWinByVote,
  maybeTriggerVillageWin,
} from '../../../game/gameResultsService.js';
import { schedulePhaseTransition } from '../../../game/gamePhaseUtils.js';
import { getFactionForRole } from '../../../game/rolesService.js';

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

  const buildSortedVoteEntries = (lobby, votesByVoterId) =>
    Array.from(votesByVoterId.entries())
      .map(([voterUserId, targetUserId]) => ({
        voterUserId,
        voterName: lobby.members.get(voterUserId)?.name ?? 'Unknown Player',
        targetUserId,
        targetName: lobby.members.get(targetUserId)?.name ?? 'Unknown Player',
      }))
      .sort((a, b) => a.voterName.localeCompare(b.voterName));

  const buildTiedTargetNames = (lobby, votesByVoterId, topVotes) => {
    if (topVotes <= 0) return [];
    const tally = new Map();
    for (const targetId of votesByVoterId.values()) {
      tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
    }
    return Array.from(tally.entries())
      .filter(([, count]) => count === topVotes)
      .map(([targetId]) => lobby.members.get(targetId)?.name ?? 'Unknown Player')
      .sort((a, b) => a.localeCompare(b));
  };

  const appendRecapEvent = (lobby, event) => {
    if (!Array.isArray(lobby.roundRecapEvents)) {
      lobby.roundRecapEvents = [];
    }
    lobby.roundRecapEvents.push({
      id: `${event.phase}-${event.roundNumber ?? 'x'}-${lobby.roundRecapEvents.length + 1}`,
      ...event,
    });
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
        const ballotSummary = buildSortedVoteEntries(lobby, lobby.currentVotes);
        const totalVotes = ballotSummary.length;

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
            dayNumber: lobby.dayNumber ?? null,
          });
          if (!lobby.publicEliminatedUserIds) {
            lobby.publicEliminatedUserIds = new Set();
          }
          lobby.publicEliminatedUserIds.add(topTargetId);
          const member = lobby.members.get(topTargetId);
          const voters = ballotSummary
            .filter((entry) => entry.targetUserId === topTargetId)
            .map(({ voterUserId, voterName }) => ({
              userId: voterUserId,
              name: voterName,
            }));
          const role = lobby.playerRoles?.get(topTargetId) ?? null;
          const shouldRevealRole = lobby.roleRevealOnElimination !== false;
          lobby.currentEliminationResult = {
            userId: topTargetId,
            name: member?.name ?? 'Unknown Player',
            notebook: lobby.playerNotebooks?.get(topTargetId) ?? '',
            role: shouldRevealRole ? role : null,
            faction: shouldRevealRole ? getFactionForRole(role) : null,
            eliminationSummary:
              lobby.eliminationInfoByUserId?.get(topTargetId)?.summary ?? 'Voted out by the village.',
            voteCount: topVotes,
            totalVotes,
            voters,
            ballotSummary,
            noElimination: false,
          };
          appendRecapEvent(lobby, {
            phase: 'vote',
            roundNumber: lobby.dayNumber ?? null,
            title: `${member?.name ?? 'Unknown Player'} was executed`,
            description: `${topVotes} of ${totalVotes} votes pushed the village to execute ${member?.name ?? 'them'}.`,
            tone: 'danger',
            affectedUserIds: [topTargetId],
            affectedNames: [member?.name ?? 'Unknown Player'],
          });
        } else {
          const tiedTargetNames = buildTiedTargetNames(lobby, lobby.currentVotes, topVotes);
          lobby.currentEliminationResult = {
            noElimination: true,
            totalVotes,
            tiedTargetNames,
          };
          appendRecapEvent(lobby, {
            phase: 'vote',
            roundNumber: lobby.dayNumber ?? null,
            title: totalVotes > 0 ? 'The vote ended without an execution' : 'No votes were cast',
            description:
              tiedTargetNames.length > 1
                ? `The village split between ${tiedTargetNames.join(', ')}.`
                : totalVotes > 0
                  ? 'The village failed to reach a clear verdict.'
                  : 'Silence held, and no one stepped forward to condemn a target.',
            tone: 'neutral',
            affectedUserIds: [],
            affectedNames: tiedTargetNames,
          });
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
