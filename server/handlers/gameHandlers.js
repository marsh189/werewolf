import { emitLobbyUpdate } from '../lobbyService.js';
import { requireAckAndLobby, requireLobbyMembership, requireTargetUserId } from './shared.js';

export const registerGameHandlers = ({ io, socket, user }) => {
  socket.on('game:init', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const myRole = lobby.playerRoles.get(user.id) ?? null;
    const werewolfUserIds =
      myRole === 'Werewolf'
        ? Array.from(lobby.playerRoles.entries())
            .filter(([, role]) => role === 'Werewolf')
            .map(([userId]) => userId)
        : [];

    return ack({
      ok: true,
      game: {
        started: lobby.started,
        phase: lobby.gamePhase ?? 'lobby',
        dayNumber: lobby.dayNumber ?? null,
        nightNumber: lobby.nightNumber ?? null,
        phaseEndsAt: lobby.phaseEndsAt ?? null,
        currentNightDeathReveal: lobby.currentNightDeathReveal ?? null,
        currentEliminationResult: lobby.currentEliminationResult ?? null,
        role: myRole,
        werewolfUserIds,
        hostUserId: lobby.hostUserId,
        canWriteNotebook: !lobby.eliminatedUserIds?.has(user.id),
      },
    });
  });

  socket.on('game:getNotebook', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'day' && lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not available in current phase' });
    }
    if (!lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Notebook can only be viewed for dead players' });
    }

    const member = lobby.members.get(targetUserId);
    return ack({
      ok: true,
      notebook: {
        userId: targetUserId,
        name: member?.name ?? 'Unknown Player',
        content: lobby.playerNotebooks?.get(targetUserId) ?? '',
      },
    });
  });

  socket.on('game:nightKill', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'night') {
      return ack({ ok: false, error: 'Not in night phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot act' });
    }
    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Werewolf') {
      return ack({ ok: false, error: 'Only werewolves can kill at night' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Target must be alive and in lobby' });
    }

    lobby.pendingNightKillTargetId = targetUserId;
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });

  socket.on('game:castVote', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (lobby.gamePhase !== 'vote') {
      return ack({ ok: false, error: 'Not in voting phase' });
    }
    if (lobby.eliminatedUserIds?.has(user.id)) {
      return ack({ ok: false, error: 'Dead players cannot vote' });
    }
    if (!lobby.members.has(targetUserId) || lobby.eliminatedUserIds?.has(targetUserId)) {
      return ack({ ok: false, error: 'Votes can only target alive players' });
    }

    if (!lobby.currentVotes) {
      lobby.currentVotes = new Map();
    }
    const currentSelection = lobby.currentVotes.get(user.id) ?? null;
    if (currentSelection === targetUserId) {
      lobby.currentVotes.delete(user.id);
      return ack({ ok: true, cleared: true });
    }
    lobby.currentVotes.set(user.id, targetUserId);
    return ack({ ok: true });
  });

  socket.on('game:updateNotebook', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const { notes } = data ?? {};
    if (typeof notes !== 'string') {
      return ack({ ok: false, error: 'Invalid notes' });
    }

    if (!lobby.playerNotebooks) {
      lobby.playerNotebooks = new Map();
    }
    lobby.playerNotebooks.set(user.id, notes.slice(0, 5000));
    return ack({ ok: true });
  });

  socket.on('game:setPlayerEliminated', (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
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
    if (!lobby.pendingNightDeathReveals) {
      lobby.pendingNightDeathReveals = [];
    }
    if (!lobby.playerNotebooks) {
      lobby.playerNotebooks = new Map();
    }

    if (eliminated === false) {
      lobby.eliminatedUserIds.delete(targetUserId);
      if (cause === 'night') {
        lobby.pendingNightDeathReveals = lobby.pendingNightDeathReveals.filter(
          (entry) => entry.userId !== targetUserId,
        );
      }
    } else {
      lobby.eliminatedUserIds.add(targetUserId);
      if (cause === 'night') {
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
    }

    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });
};
