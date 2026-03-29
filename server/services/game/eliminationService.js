/* =============================================================================
   Elimination Helpers (Server)

   Functions that record deaths and special role conversions (Executioner -> Jester).
============================================================================= */

export const setEliminationInfo = (lobby, userId, info) => {
  if (!userId) return;
  if (!lobby.eliminationInfoByUserId) {
    lobby.eliminationInfoByUserId = new Map();
  }
  lobby.eliminationInfoByUserId.set(userId, {
    at: Date.now(),
    ...info,
  });
};

export const addNightDeathReveal = (lobby, userId) => {
  if (!lobby.members.has(userId) || lobby.eliminatedUserIds.has(userId)) return false;
  lobby.eliminatedUserIds.add(userId);
  const member = lobby.members.get(userId);
  lobby.pendingNightDeathReveals.push({
    userId,
    name: member?.name ?? 'Unknown Player',
    notebook: lobby.playerNotebooks?.get(userId) ?? '',
  });
  return true;
};

export const convertExecutionersToJesterForNightDeaths = (lobby, nightDeathUserIds) => {
  const nightDeaths = nightDeathUserIds instanceof Set
    ? nightDeathUserIds
    : new Set(nightDeathUserIds ?? []);
  for (const [userId, role] of lobby.playerRoles.entries()) {
    if (role !== 'Executioner') continue;
    if (lobby.eliminatedUserIds.has(userId)) continue;
    const roleState = lobby.playerRoleState?.get(userId);
    const targetUserId = roleState?.executionerTargetUserId ?? null;
    if (!targetUserId || !nightDeaths.has(targetUserId)) continue;
    lobby.playerRoles.set(userId, 'Jester');
    roleState.executionerTargetUserId = null;
    lobby.playerRoleState?.set(userId, roleState);
  }
};

