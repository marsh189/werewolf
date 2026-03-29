import { NIGHT_DEATH_REVEAL_DURATION_MS } from '../../../../state/constants.js';
import {
  addSystemChatMessage,
  addTargetedSystemChatMessage,
  emitChatMessage,
} from '../../../chatService.js';
import { emitLobbyUpdate } from '../../../lobbyEmitService.js';
import { maybeTriggerVillageWin } from '../../../game/gameResultsService.js';
import {
  clearNightActionSelections,
  getAliveUserIds,
  schedulePhaseTransition,
} from '../../../game/gamePhaseUtils.js';
import {
  emitNightActionNotice,
  resolveNightAndStartResults,
} from '../../../game/nightResolutionService.js';
import { isWerewolfRole } from '../../../game/rolesService.js';

const NIGHT_ACTION_RESULTS_DURATION_MS = 5000;

/* =============================================================================
   Lobby Phase Engine: Night

   Night is special because:
   - chat rules change (werewolves can chat, villagers cannot)
   - players submit "pending" actions
   - the server resolves all actions atomically at the end of the timer
============================================================================= */

export const createNightPhases = ({ getStartDayPhase }) => {
  const startNightActionResultsPhase = (io, lobby) => {
    lobby.gamePhase = 'nightActionResults';
    lobby.currentNightDeathReveal = null;

    const reveals = Array.isArray(lobby.pendingNightDeathReveals)
      ? lobby.pendingNightDeathReveals
      : [];
    const killedUserIds = reveals.map((reveal) => reveal?.userId).filter(Boolean);

    if (killedUserIds.length > 0) {
      emitNightActionNotice(
        io,
        lobby,
        killedUserIds,
        'You were killed during the night.',
        'private',
        'death',
      );
    }

    schedulePhaseTransition(io, lobby, NIGHT_ACTION_RESULTS_DURATION_MS, () => {
      startNightResultsPhase(io, lobby);
    });
    emitLobbyUpdate(io, lobby);
  };

  const startNightPhase = (io, lobby, nightNumber) => {
    lobby.gamePhase = 'night';
    lobby.nightNumber = nightNumber;
    lobby.currentNightDeathReveal = null;
    lobby.pendingNightDeathReveals = [];
    clearNightActionSelections(lobby);
    lobby.currentVotes = new Map();
    lobby.currentEliminationResult = null;

    /* -------------------------------------------------------------------------
       Alpha Wolf guarantee

       If the Alpha Wolf is dead, promote a random alive werewolf. This keeps
       "alpha-only" mechanics and UI stable.
    ------------------------------------------------------------------------- */

    const aliveNow = getAliveUserIds(lobby);
    const hasAliveAlpha = Array.from(lobby.playerRoles.entries()).some(
      ([userId, role]) =>
        role === 'AlphaWolf' &&
        aliveNow.has(userId) &&
        !lobby.eliminatedUserIds.has(userId),
    );

    if (!hasAliveAlpha) {
      const aliveWerewolfIds = Array.from(lobby.playerRoles.entries())
        .filter(
          ([userId, role]) =>
            isWerewolfRole(role) &&
            aliveNow.has(userId) &&
            !lobby.eliminatedUserIds.has(userId),
        )
        .map(([userId]) => userId);

      if (aliveWerewolfIds.length > 0) {
        const selectedUserId =
          aliveWerewolfIds[Math.floor(Math.random() * aliveWerewolfIds.length)];
        if (lobby.playerRoles.get(selectedUserId) !== 'AlphaWolf') {
          lobby.playerRoles.set(selectedUserId, 'AlphaWolf');
          const noticeContent = `${lobby.members.get(selectedUserId)?.name ?? 'A werewolf'} has been promoted to Alpha Wolf.`;
          emitNightActionNotice(
            io,
            lobby,
            aliveWerewolfIds,
            noticeContent,
            'werewolf',
            'default',
          );
        }
      }
    }

    /* -------------------------------------------------------------------------
       Night chat rules
    ------------------------------------------------------------------------- */

    const werewolfNotice = addSystemChatMessage(lobby, {
      audience: 'werewolf',
      content: 'Werewolves can now chat secretly to decide who to kill.',
    });
    emitChatMessage(io, lobby, werewolfNotice);

    const nonWerewolfUserIds = Array.from(lobby.members.keys()).filter((userId) => {
      if (lobby.eliminatedUserIds?.has(userId)) return false;
      return !isWerewolfRole(lobby.playerRoles?.get(userId));
    });

    if (nonWerewolfUserIds.length > 0) {
      const villageChatLockedNotice = addTargetedSystemChatMessage(lobby, {
        audience: 'private',
        recipientUserIds: nonWerewolfUserIds,
        content: 'Villagers cannot chat during the night.',
      });
      emitChatMessage(io, lobby, villageChatLockedNotice);
    }

    /* -------------------------------------------------------------------------
       Night timer -> resolve
    ------------------------------------------------------------------------- */

    schedulePhaseTransition(
      io,
      lobby,
      (lobby.phaseDurations?.nightSeconds ?? 10) * 1000,
      () => {
        resolveNightAndStartResults(io, lobby, startNightActionResultsPhase);
      },
    );
    emitLobbyUpdate(io, lobby);
  };

  const startNightResultsPhase = (io, lobby) => {
    const reveals = Array.isArray(lobby.pendingNightDeathReveals)
      ? lobby.pendingNightDeathReveals
      : [];

    for (const reveal of reveals) {
      const recipientUserIds = Array.from(lobby.members.keys()).filter(
        (userId) => userId !== reveal.userId,
      );
      const deathNotice = addTargetedSystemChatMessage(lobby, {
        audience: 'private',
        recipientUserIds,
        content: `${reveal.name} died during the night.`,
        tone: 'death',
      });
      emitChatMessage(io, lobby, deathNotice);
    }

    if (!reveals.length) {
      lobby.gamePhase = 'nightResults';
      lobby.currentNightDeathReveal = null;
      schedulePhaseTransition(io, lobby, NIGHT_DEATH_REVEAL_DURATION_MS, () => {
        if (maybeTriggerVillageWin(io, lobby)) return;
        getStartDayPhase()(io, lobby, (lobby.dayNumber ?? 0) + 1);
      });
      emitLobbyUpdate(io, lobby);
      return;
    }

    let index = 0;
    const showNextReveal = () => {
      lobby.gamePhase = 'nightResults';
      const currentReveal = reveals[index] ?? null;
      lobby.currentNightDeathReveal = currentReveal;
      if (currentReveal?.userId) {
        if (!lobby.publicEliminatedUserIds) {
          lobby.publicEliminatedUserIds = new Set();
        }
        lobby.publicEliminatedUserIds.add(currentReveal.userId);
      }

      schedulePhaseTransition(io, lobby, NIGHT_DEATH_REVEAL_DURATION_MS, () => {
        index += 1;
        if (index < reveals.length) {
          showNextReveal();
          return;
        }
        lobby.pendingNightDeathReveals = [];
        lobby.currentNightDeathReveal = null;
        if (maybeTriggerVillageWin(io, lobby)) return;
        getStartDayPhase()(io, lobby, (lobby.dayNumber ?? 0) + 1);
      });
      emitLobbyUpdate(io, lobby);
    };

    showNextReveal();
  };

  return {
    startNightPhase,
  };
};

