/* =============================================================================
   Night Actions: Trapper Alert Toggle

   Trapper can spend limited "alerts" to be notified if someone visits them.

   We store alert intent on the lobby as a Set of active trapper userIds.
============================================================================= */

export const registerTrapperAlertHandler = ({
  io,
  socket,
  user,
  CLIENT_EVENTS,
  emitLobbyUpdate,
  isRapidAction,
  requireAckAndLobby,
  requireAliveActor,
  requireGamePhase,
  requireLobbyMembership,
}) => {
  socket.on(CLIENT_EVENTS.GAME_TOGGLE_TRAPPER_ALERT, (data, callback) => {
    const { ack, lobby } = requireAckAndLobby(data, callback);
    if (!lobby) return;
    if (!requireLobbyMembership(lobby, user.id, ack)) return;

    if (!requireGamePhase(lobby, 'night', ack, 'Not in night phase')) return;
    if (!requireAliveActor(lobby, user.id, ack)) return;
    if (lobby.playerRoles.get(user.id) !== 'Trapper') {
      return ack({ ok: false, error: 'Your role cannot set alerts' });
    }
    if (isRapidAction(lobby, user.id, 'toggleTrapperAlert')) {
      return ack({ ok: true, throttled: true });
    }

    if (!lobby.pendingTrapperAlertUserIds) {
      lobby.pendingTrapperAlertUserIds = new Set();
    }
    const currentlyActive = lobby.pendingTrapperAlertUserIds.has(user.id);

    if (!lobby.playerRoleState) {
      lobby.playerRoleState = new Map();
    }
    const myRoleState = lobby.playerRoleState.get(user.id) ?? {
      hunterShotsRemaining: 0,
      trapperAlertsRemaining: 0,
      doctorSelfProtectUsed: false,
      executionerTargetUserId: null,
    };
    lobby.playerRoleState.set(user.id, myRoleState);

    if (currentlyActive) {
      lobby.pendingTrapperAlertUserIds.delete(user.id);
      myRoleState.trapperAlertsRemaining += 1;
      lobby.playerRoleState?.set(user.id, myRoleState);
      emitLobbyUpdate(io, lobby);
      return ack({ ok: true, active: false });
    }

    if ((myRoleState?.trapperAlertsRemaining ?? 0) <= 0) {
      return ack({ ok: false, error: 'No Trapper alerts remaining' });
    }

    myRoleState.trapperAlertsRemaining -= 1;
    lobby.playerRoleState?.set(user.id, myRoleState);
    lobby.pendingTrapperAlertUserIds.add(user.id);
    emitLobbyUpdate(io, lobby);
    return ack({ ok: true, active: true });
  });
};

