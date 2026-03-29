/* =============================================================================
   Lobby Cleanup Helpers

   When a user leaves a lobby, we need to clean up any state that references them:
   - pending night-action targets (as the actor or as the target)
   - votes
   - death reveal queues
   - notebooks/role state
============================================================================= */

const deleteMapKey = (map, key) => {
  map?.delete?.(key);
};

const deleteEntriesWhereValue = (map, value) => {
  for (const [k, v] of map?.entries?.() ?? []) {
    if (v === value) {
      map.delete(k);
    }
  }
};

const deleteFromSet = (set, value) => {
  set?.delete?.(value);
};

export const removeUserFromLobbyState = (lobby, userId) => {
  if (!lobby || !userId) return;

  lobby.members?.delete?.(userId);
  lobby.eliminatedUserIds?.delete?.(userId);
  lobby.publicEliminatedUserIds?.delete?.(userId);
  lobby.playerNotebooks?.delete?.(userId);
  lobby.playerRoles?.delete?.(userId);
  lobby.playerRoleState?.delete?.(userId);
  lobby.disconnectCleanupTimers?.delete?.(userId);

  // Werewolf kill selection can be stored as (actor, target).
  if (lobby.pendingWerewolfKillTargetId === userId) {
    lobby.pendingWerewolfKillTargetId = null;
    lobby.pendingWerewolfKillActorUserId = null;
  }
  if (lobby.pendingWerewolfKillActorUserId === userId) {
    lobby.pendingWerewolfKillTargetId = null;
    lobby.pendingWerewolfKillActorUserId = null;
  }
  if (lobby.pendingAlphaWolfKillTargetId === userId) {
    lobby.pendingAlphaWolfKillTargetId = null;
  }

  // Remove as actor selections.
  deleteMapKey(lobby.pendingHunterKillTargets, userId);
  deleteFromSet(lobby.pendingTrapperAlertUserIds, userId);
  deleteMapKey(lobby.pendingEscortVisitTargets, userId);
  deleteMapKey(lobby.pendingBodyguardGuardTargets, userId);
  deleteMapKey(lobby.pendingDoctorProtectTargets, userId);
  deleteMapKey(lobby.pendingTrackerWatchTargets, userId);
  deleteMapKey(lobby.pendingLookoutWatchTargets, userId);
  deleteMapKey(lobby.pendingInvestigatorVisitTargets, userId);
  deleteMapKey(lobby.pendingFramerTargets, userId);
  deleteMapKey(lobby.pendingProwlerTargets, userId);
  deleteMapKey(lobby.pendingSnatcherTargets, userId);
  deleteMapKey(lobby.pendingCursedTargets, userId);
  deleteMapKey(lobby.pendingMimicTargets, userId);

  // Remove as someone else's target.
  deleteEntriesWhereValue(lobby.pendingHunterKillTargets, userId);
  deleteEntriesWhereValue(lobby.pendingEscortVisitTargets, userId);
  deleteEntriesWhereValue(lobby.pendingBodyguardGuardTargets, userId);
  deleteEntriesWhereValue(lobby.pendingDoctorProtectTargets, userId);
  deleteEntriesWhereValue(lobby.pendingTrackerWatchTargets, userId);
  deleteEntriesWhereValue(lobby.pendingLookoutWatchTargets, userId);
  deleteEntriesWhereValue(lobby.pendingInvestigatorVisitTargets, userId);
  deleteEntriesWhereValue(lobby.pendingFramerTargets, userId);
  deleteEntriesWhereValue(lobby.pendingProwlerTargets, userId);
  deleteEntriesWhereValue(lobby.pendingSnatcherTargets, userId);
  deleteEntriesWhereValue(lobby.pendingCursedTargets, userId);
  deleteEntriesWhereValue(lobby.pendingMimicTargets, userId);

  // Votes: remove their vote + votes targeting them.
  lobby.currentVotes?.delete?.(userId);
  deleteEntriesWhereValue(lobby.currentVotes, userId);

  lobby.pendingNightDeathReveals = (lobby.pendingNightDeathReveals ?? []).filter(
    (entry) => entry.userId !== userId,
  );
  if (lobby.currentNightDeathReveal?.userId === userId) {
    lobby.currentNightDeathReveal = null;
  }
};

