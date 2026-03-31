import { resetLobbyChat } from '../../chatService.js';

/* =============================================================================
   Lobby Reset Service

   These helpers are the "reset button" for a lobby.

   They deliberately do not touch membership (`lobby.members`) or lobby settings
   (`werewolfCount`, durations, etc.). That makes them safe to call:
   - when creating a lobby
   - when ending a game
   - when starting a new game inside the same lobby
============================================================================= */

export const clearRoundState = (lobby) => {
  /* ---------------------------------------------------------------------------
     Round / Phase state
  --------------------------------------------------------------------------- */

  lobby.dayNumber = null;
  lobby.nightNumber = null;
  lobby.phaseEndsAt = null;
  lobby.currentNightDeathReveal = null;
  lobby.pendingNightDeathReveals = [];

  /* ---------------------------------------------------------------------------
     Pending night actions (client intent)

     Important: clients never apply game effects directly.
     They only write "pending" selections, which are later resolved by the
     night resolver in one place.
  --------------------------------------------------------------------------- */

  lobby.pendingWerewolfKillTargetId = null;
  lobby.pendingWerewolfKillActorUserId = null;
  lobby.pendingAlphaWolfKillTargetId = null;
  lobby.pendingHunterKillTargets = new Map();
  lobby.pendingTrapperAlertUserIds = new Set();
  lobby.pendingEscortVisitTargets = new Map();
  lobby.pendingBodyguardGuardTargets = new Map();
  lobby.pendingDoctorProtectTargets = new Map();
  lobby.pendingTrackerWatchTargets = new Map();
  lobby.pendingLookoutWatchTargets = new Map();
  lobby.pendingInvestigatorVisitTargets = new Map();
  lobby.pendingFramerTargets = new Map();
  lobby.pendingProwlerTargets = new Map();
  lobby.pendingSnatcherTargets = new Map();
  lobby.pendingCursedTargets = new Map();
  lobby.pendingMimicTargets = new Map();

  /* ---------------------------------------------------------------------------
     Voting / throttling
  --------------------------------------------------------------------------- */

  lobby.currentVotes = new Map();
  lobby.actionTimestamps = new Map();
  lobby.currentEliminationResult = null;
};

const clearPlayerGameData = (lobby) => {
  lobby.playerRoles = new Map();
  lobby.playerRoleState = new Map();
  lobby.playerNotebooks = new Map();
  lobby.eliminatedUserIds = new Set();
  lobby.publicEliminatedUserIds = new Set();
  lobby.eliminationInfoByUserId = new Map();
};

export const resetGameState = (lobby, { resetPlayers = true } = {}) => {
  /* ---------------------------------------------------------------------------
     Public game state
  --------------------------------------------------------------------------- */

  lobby.gameResults = null;
  lobby.eliminationInfoByUserId = new Map();
  lobby.inGameUserCounts = new Map();
  lobby.roundRecapEvents = [];

  /* ---------------------------------------------------------------------------
     Round state (phase engine)
  --------------------------------------------------------------------------- */

  clearRoundState(lobby);

  /* ---------------------------------------------------------------------------
     Chat
  --------------------------------------------------------------------------- */

  resetLobbyChat(lobby);

  /* ---------------------------------------------------------------------------
     Player-specific state
  --------------------------------------------------------------------------- */

  if (resetPlayers) {
    clearPlayerGameData(lobby);
  }
};
