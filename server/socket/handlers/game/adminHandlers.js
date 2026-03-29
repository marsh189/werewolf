import { CLIENT_EVENTS } from '../../events.js';
import { emitLobbyUpdate } from '../../../services/index.js';
import {
  addNightDeathReveal,
  convertExecutionersToJesterForNightDeaths,
} from '../../../services/game/index.js';
import {
  requireAckAndLobby,
  requireLobbyMembership,
  requireTargetUserId,
} from '../shared.js';

/* =============================================================================
   Game Handlers: Host / Admin
============================================================================= */

export const registerGameAdminHandlers = ({ io, socket, user }) => {
  socket.on(CLIENT_EVENTS.GAME_SET_PLAYER_ELIMINATED, (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;
    if (lobby.hostUserId !== user.id) {
      return ack({ ok: false, error: 'Only host can update player status' });
    }

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    const { eliminated, cause } = data ?? {};
    if (!lobby.members.has(targetUserId)) {
      return ack({ ok: false, error: 'Target user is not in this lobby' });
    }

    if (!lobby.eliminatedUserIds) {
      lobby.eliminatedUserIds = new Set();
    }
    if (!lobby.publicEliminatedUserIds) {
      lobby.publicEliminatedUserIds = new Set();
    }
    if (!lobby.pendingNightDeathReveals) {
      lobby.pendingNightDeathReveals = [];
    }
    if (!lobby.playerNotebooks) {
      lobby.playerNotebooks = new Map();
    }

    if (eliminated === false) {
      lobby.eliminatedUserIds.delete(targetUserId);
      lobby.publicEliminatedUserIds.delete(targetUserId);
      lobby.eliminationInfoByUserId?.delete(targetUserId);
      if (cause === 'night') {
        lobby.pendingNightDeathReveals = lobby.pendingNightDeathReveals.filter(
          (entry) => entry.userId !== targetUserId,
        );
      }
    } else {
      lobby.eliminatedUserIds.add(targetUserId);
      if (cause === 'night') {
        if (!lobby.eliminationInfoByUserId) {
          lobby.eliminationInfoByUserId = new Map();
        }
        lobby.eliminationInfoByUserId.set(targetUserId, {
          at: Date.now(),
          kind: 'host',
          summary: 'Killed during the night.',
        });
        convertExecutionersToJesterForNightDeaths(lobby, [targetUserId]);
        const addedReveal = addNightDeathReveal(lobby, targetUserId);
        if (!addedReveal) {
          const member = lobby.members.get(targetUserId);
          const existingIndex = lobby.pendingNightDeathReveals.findIndex(
            (entry) => entry.userId === targetUserId,
          );
          const revealEntry = {
            userId: targetUserId,
            name: member?.name ?? 'Unknown Player',
            notebook: lobby.playerNotebooks.get(targetUserId) ?? '',
          };
          if (existingIndex >= 0) {
            lobby.pendingNightDeathReveals[existingIndex] = revealEntry;
          } else {
            lobby.pendingNightDeathReveals.push(revealEntry);
          }
        }
      } else {
        if (!lobby.eliminationInfoByUserId) {
          lobby.eliminationInfoByUserId = new Map();
        }
        lobby.eliminationInfoByUserId.set(targetUserId, {
          at: Date.now(),
          kind: 'host',
          summary: 'Eliminated by the host.',
        });
        lobby.publicEliminatedUserIds.add(targetUserId);
      }
    }

    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });
};

