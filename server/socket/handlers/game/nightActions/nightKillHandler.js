/* =============================================================================
   Night Actions: Night Kill

   Handles the "kill" action for:
   - Werewolf (shared team kill, tracks the acting user)
   - AlphaWolf (single target)
   - Hunter (limited shots, per-player targets)
============================================================================= */

export const registerNightKillHandler = ({
  io,
  socket,
  user,
  CLIENT_EVENTS,
  emitLobbyUpdate,
  isRapidAction,
  requireAckAndLobby,
  requireAliveActor,
  requireAliveTargetMember,
  requireGamePhase,
  requireLobbyMembership,
  requireTargetUserId,
}) => {
  socket.on(CLIENT_EVENTS.GAME_NIGHT_KILL, (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    const targetUserId = requireTargetUserId(data, ack);
    if (!targetUserId) return;

    if (!requireGamePhase(lobby, 'night', ack, 'Not in night phase')) return;
    if (!requireAliveActor(lobby, user.id, ack)) return;

    const myRole = lobby.playerRoles.get(user.id);
    if (myRole !== 'Werewolf' && myRole !== 'AlphaWolf' && myRole !== 'Hunter') {
      return ack({ ok: false, error: 'Your role cannot perform a night kill' });
    }

    if (myRole === 'AlphaWolf' && targetUserId === user.id) {
      return ack({ ok: false, error: 'Alpha Wolf cannot target themselves' });
    }
    if (myRole === 'Hunter' && targetUserId === user.id) {
      return ack({ ok: false, error: 'You cannot target yourself' });
    }

    if (!requireAliveTargetMember(lobby, targetUserId, ack)) return;
    if (isRapidAction(lobby, user.id, 'nightKill')) {
      return ack({ ok: true, throttled: true });
    }

    if (myRole === 'AlphaWolf') {
      if (lobby.pendingAlphaWolfKillTargetId === targetUserId) {
        lobby.pendingAlphaWolfKillTargetId = null;
        emitLobbyUpdate(io, lobby);
        return ack({ ok: true, cleared: true });
      }
      lobby.pendingAlphaWolfKillTargetId = targetUserId;
    } else if (myRole === 'Werewolf') {
      if (
        lobby.pendingWerewolfKillTargetId === targetUserId &&
        lobby.pendingWerewolfKillActorUserId === user.id
      ) {
        lobby.pendingWerewolfKillTargetId = null;
        lobby.pendingWerewolfKillActorUserId = null;
        emitLobbyUpdate(io, lobby);
        return ack({ ok: true, cleared: true });
      }
      lobby.pendingWerewolfKillTargetId = targetUserId;
      lobby.pendingWerewolfKillActorUserId = user.id;
    } else {
      if (!lobby.pendingHunterKillTargets) {
        lobby.pendingHunterKillTargets = new Map();
      }

      const myRoleState = lobby.playerRoleState?.get(user.id);
      if ((myRoleState?.hunterShotsRemaining ?? 0) <= 0) {
        return ack({ ok: false, error: 'No Hunter shots remaining' });
      }

      if (lobby.pendingHunterKillTargets.get(user.id) === targetUserId) {
        lobby.pendingHunterKillTargets.delete(user.id);
        emitLobbyUpdate(io, lobby);
        return ack({ ok: true, cleared: true });
      }

      lobby.pendingHunterKillTargets.set(user.id, targetUserId);
    }

    emitLobbyUpdate(io, lobby);
    return ack({ ok: true });
  });
};

