'use client';

import type { GameInitResponse } from '@/models/game';

/* =============================================================================
   Game Snapshot Selectors

   Pure helper functions for deriving UI-friendly values from the latest
   `game:init` snapshot payload.
============================================================================= */

type GameSnapshot = NonNullable<GameInitResponse['game']>;

/* ---------------------------------------------------------------------------
   getSelectedNightTargetUserId(game)

   Returns whichever "night action target" field applies to the player's role.
   Keeps the UI selection in sync with the latest server snapshot.
--------------------------------------------------------------------------- */
export const getSelectedNightTargetUserId = (game: GameSnapshot) => {
  switch (game.role) {
    case 'AlphaWolf':
    case 'Werewolf':
    case 'Hunter':
      return game.nightKillTargetUserId ?? null;
    case 'Escort':
      return game.escortVisitTargetUserId ?? null;
    case 'Bodyguard':
      return game.bodyguardGuardTargetUserId ?? null;
    case 'Doctor':
      return game.doctorProtectTargetUserId ?? null;
    case 'Tracker':
      return game.trackerWatchTargetUserId ?? null;
    case 'Lookout':
      return game.lookoutWatchTargetUserId ?? null;
    case 'Investigator':
      return game.investigatorVisitTargetUserId ?? null;
    case 'Framer':
      return game.framerTargetUserId ?? null;
    case 'Prowler':
      return game.prowlerTargetUserId ?? null;
    case 'Snatcher':
      return game.snatcherTargetUserId ?? null;
    case 'Cursed':
      return game.cursedTargetUserId ?? null;
    case 'Mimic':
      return game.mimicTargetUserId ?? null;
    default:
      return null;
  }
};
