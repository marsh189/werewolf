'use client';

import type { GamePhase } from '@/models/game';
import type { LobbyMember } from '@/models/lobby';

/* =============================================================================
   Game UI Selectors

   Pure helper functions for turning raw lobby/game state into UI-friendly
   derived values. Keeping these out of pages helps:
   - reduce inline logic in large components
   - keep "why" comments close to the logic they document
============================================================================= */

/* ---------------------------------------------------------------------------
   sortMembersAliveFirst(members)

   Stable partition:
   - alive members first
   - preserves original server ordering within alive/dead groups
--------------------------------------------------------------------------- */
export const sortMembersAliveFirst = (members: LobbyMember[]) => {
  const alive: LobbyMember[] = [];
  const dead: LobbyMember[] = [];

  for (const member of members) {
    (member.alive ? alive : dead).push(member);
  }

  return [...alive, ...dead];
};

/* ---------------------------------------------------------------------------
   buildNightResultsSequenceKey(...)

   Used to restart the animated night-results sequence when the revealed death
   changes, without re-triggering on duplicate snapshots.
--------------------------------------------------------------------------- */
export const buildNightResultsSequenceKey = (
  revealDeathUserId: string | null,
  currentNightNumber: number | null,
) => (revealDeathUserId ? `death-${revealDeathUserId}` : `none-${currentNightNumber ?? 0}`);

/* ---------------------------------------------------------------------------
   buildChatRefreshKey(...)

   `GameChat` needs a forced refresh when any of these change because the server
   may change the user's chat audience/permissions.
--------------------------------------------------------------------------- */
export const buildChatRefreshKey = ({
  currentPhase,
  roleName,
  selfAlive,
  started,
}: {
  currentPhase: GamePhase;
  roleName: string;
  selfAlive: boolean;
  started: boolean;
}) => `${currentPhase}:${roleName}:${selfAlive ? 'alive' : 'dead'}:${started ? 'started' : 'stopped'}`;
