'use client';

import type {
  LobbyPhaseDurations,
  LobbySettingsUpdate,
  LobbyView,
} from '@/models/lobby';
import { getRemainingSecondsCeil } from '@/lib/formatters/timeFormatters';

/* =============================================================================
   Lobby UI Selectors

   Pure helper functions for turning lobby snapshots into UI-friendly derived
   values (and consistent update payloads).
============================================================================= */

/* ---------------------------------------------------------------------------
   DEFAULT_PHASE_DURATIONS

   Fallback values used before a lobby snapshot is available.
--------------------------------------------------------------------------- */
export const DEFAULT_PHASE_DURATIONS: LobbyPhaseDurations = {
  daySeconds: 10,
  nightSeconds: 10,
  voteSeconds: 10,
};

/* ---------------------------------------------------------------------------
   getMinWerewolves(specialRolesEnabled)

   Special roles require at least 2 werewolves for balance.
--------------------------------------------------------------------------- */
export const getMinWerewolves = (specialRolesEnabled: boolean) =>
  specialRolesEnabled ? 2 : 1;

/* ---------------------------------------------------------------------------
   getStartingRemainingSeconds(startingAt, nowMs)

   Converts the server's `startingAt` timestamp into a countdown number.
--------------------------------------------------------------------------- */
export const getStartingRemainingSeconds = (
  startingAt: number | null | undefined,
  nowMs: number | null,
) =>
  startingAt && nowMs !== null ? getRemainingSecondsCeil(startingAt, nowMs) : null;

export type LobbySettingsDisplay = Omit<LobbySettingsUpdate, 'phaseDurations'> & {
  phaseDurations: LobbyPhaseDurations;
};

/* ---------------------------------------------------------------------------
   buildLobbySettingsPayload(lobbyInfo, overrides?)

   Builds a full, consistent settings payload to:
   - render the settings UI (clamped values)
   - send to the server via `lobby:updateSettings`
--------------------------------------------------------------------------- */
export const buildLobbySettingsPayload = (
  lobbyInfo: Pick<
    LobbyView,
    | 'werewolfCount'
    | 'specialRolesEnabled'
    | 'neutralRolesEnabled'
    | 'phaseDurations'
  >,
  overrides: Partial<{
    werewolfCount: number;
    specialRolesEnabled: boolean;
    neutralRolesEnabled: boolean;
    phaseDurations: LobbyPhaseDurations;
  }> = {},
): LobbySettingsDisplay => {
  const nextSpecial =
    overrides.specialRolesEnabled ?? lobbyInfo.specialRolesEnabled ?? false;
  const nextNeutralRaw =
    overrides.neutralRolesEnabled ?? lobbyInfo.neutralRolesEnabled ?? false;

  // Neutral roles are only available when special roles are enabled.
  const nextNeutral = nextSpecial ? nextNeutralRaw : false;

  const minWerewolves = getMinWerewolves(nextSpecial);
  const desiredWerewolves =
    overrides.werewolfCount ?? lobbyInfo.werewolfCount ?? minWerewolves;
  const nextWerewolves = Math.max(minWerewolves, desiredWerewolves);

  return {
    werewolfCount: nextWerewolves,
    specialRolesEnabled: nextSpecial,
    neutralRolesEnabled: nextNeutral,
    phaseDurations: overrides.phaseDurations ?? lobbyInfo.phaseDurations ?? DEFAULT_PHASE_DURATIONS,
  };
};
