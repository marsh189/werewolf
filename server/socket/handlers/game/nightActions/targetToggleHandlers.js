/* =============================================================================
   Night Actions: Target Toggle Handlers

   Many night actions behave the same way:
   - validate lobby + membership + phase
   - validate actor role
   - toggle a per-role pending Map (actorUserId -> targetUserId)
============================================================================= */

export const registerTargetToggleHandlers = ({
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
  const registerTargetMapToggleAction = ({
    event,
    pendingMapKey,
    allowedRoles,
    actionKey,
    cannotActError,
  }) => {
    socket.on(event, (data, callback) => {
      const { ack, lobby } = requireAckAndLobby(data, callback);
      if (!lobby) return;
      if (!requireLobbyMembership(lobby, user.id, ack)) return;

      const targetUserId = requireTargetUserId(data, ack);
      if (!targetUserId) return;

      if (!requireGamePhase(lobby, 'night', ack, 'Not in night phase')) return;
      if (!requireAliveActor(lobby, user.id, ack)) return;

      const myRole = lobby.playerRoles.get(user.id);
      if (!allowedRoles.includes(myRole)) {
        return ack({ ok: false, error: cannotActError });
      }

      if (!requireAliveTargetMember(lobby, targetUserId, ack)) return;
      if (isRapidAction(lobby, user.id, actionKey)) {
        return ack({ ok: true, throttled: true });
      }

      if (!lobby[pendingMapKey]) {
        lobby[pendingMapKey] = new Map();
      }
      const pendingMap = lobby[pendingMapKey];

      if (pendingMap.get(user.id) === targetUserId) {
        pendingMap.delete(user.id);
        emitLobbyUpdate(io, lobby);
        return ack({ ok: true, cleared: true });
      }

      pendingMap.set(user.id, targetUserId);
      emitLobbyUpdate(io, lobby);
      return ack({ ok: true });
    });
  };

  const targetToggleActions = [
    {
      event: CLIENT_EVENTS.GAME_FRAME,
      pendingMapKey: 'pendingFramerTargets',
      allowedRoles: ['Framer'],
      actionKey: 'frame',
      cannotActError: 'Your role cannot frame',
    },
    {
      event: CLIENT_EVENTS.GAME_PROWL,
      pendingMapKey: 'pendingProwlerTargets',
      allowedRoles: ['Prowler'],
      actionKey: 'prowl',
      cannotActError: 'Your role cannot prowl',
    },
    {
      event: CLIENT_EVENTS.GAME_SNATCH,
      pendingMapKey: 'pendingSnatcherTargets',
      allowedRoles: ['Snatcher'],
      actionKey: 'snatch',
      cannotActError: 'Your role cannot snatch',
    },
    {
      event: CLIENT_EVENTS.GAME_CURSE,
      pendingMapKey: 'pendingCursedTargets',
      allowedRoles: ['Cursed'],
      actionKey: 'curse',
      cannotActError: 'Your role cannot curse',
    },
    {
      event: CLIENT_EVENTS.GAME_MIMIC,
      pendingMapKey: 'pendingMimicTargets',
      allowedRoles: ['Mimic'],
      actionKey: 'mimic',
      cannotActError: 'Your role cannot mimic',
    },
    {
      event: CLIENT_EVENTS.GAME_ESCORT_VISIT,
      pendingMapKey: 'pendingEscortVisitTargets',
      allowedRoles: ['Escort'],
      actionKey: 'escortVisit',
      cannotActError: 'Your role cannot visit',
    },
    {
      event: CLIENT_EVENTS.GAME_BODYGUARD_GUARD,
      pendingMapKey: 'pendingBodyguardGuardTargets',
      allowedRoles: ['Bodyguard'],
      actionKey: 'bodyguardGuard',
      cannotActError: 'Your role cannot guard',
    },
    {
      event: CLIENT_EVENTS.GAME_DOCTOR_PROTECT,
      pendingMapKey: 'pendingDoctorProtectTargets',
      allowedRoles: ['Doctor'],
      actionKey: 'doctorProtect',
      cannotActError: 'Your role cannot protect',
    },
    {
      event: CLIENT_EVENTS.GAME_TRACKER_WATCH,
      pendingMapKey: 'pendingTrackerWatchTargets',
      allowedRoles: ['Tracker'],
      actionKey: 'trackerWatch',
      cannotActError: 'Your role cannot watch',
    },
    {
      event: CLIENT_EVENTS.GAME_LOOKOUT_WATCH,
      pendingMapKey: 'pendingLookoutWatchTargets',
      allowedRoles: ['Lookout'],
      actionKey: 'lookoutWatch',
      cannotActError: 'Your role cannot watch',
    },
    {
      event: CLIENT_EVENTS.GAME_INVESTIGATE,
      pendingMapKey: 'pendingInvestigatorVisitTargets',
      allowedRoles: ['Investigator'],
      actionKey: 'investigate',
      cannotActError: 'Your role cannot investigate',
    },
  ];

  for (const config of targetToggleActions) {
    registerTargetMapToggleAction(config);
  }
};

