'use client';

import { initGame } from '@/lib/actions/gameSocketActions';
import { getSelectedNightTargetUserId } from '@/lib/selectors/gameSnapshotSelectors';
import { useNowTicker } from '@/lib/hooks/useNowTicker';
import { lobbyPath, resultsPath } from '@/lib/routes/routePaths';
import type { GameInitResponse, GamePhase, NotebookView } from '@/models/game';
import type { EliminationResult, LobbyView, NightDeathReveal } from '@/models/lobby';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type GameSnapshot = NonNullable<GameInitResponse['game']>;

type Navigation = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

/* =============================================================================
   Lobby Game State Hook

   Owns the "state orchestration" for the game page:
   - fetch the authoritative game snapshot via `game:init`
   - re-apply relevant snapshot fields when lobby realtime state changes
   - manage small UX state like selected targets, notebook modal, and redirects

   This keeps `app/lobby/[lobbyName]/game/page.tsx` focused on rendering.
============================================================================= */

export function useLobbyGameState({
  lobbyName,
  lobbyInfo,
  navigation,
}: {
  lobbyName: string | undefined;
  lobbyInfo: LobbyView | null;
  navigation: Navigation;
}) {
  const nowMs = useNowTicker(!!lobbyInfo?.startingAt, 250);
  const navigatedToResultsRef = useRef(false);
  const lastLobbySyncKeyRef = useRef<string | null>(null);

  /* ---------------------------------------------------------------------------
     Game state derived from `game:init`
  --------------------------------------------------------------------------- */

  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [nightNumber, setNightNumber] = useState<number | null>(null);
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | null>(null);
  const [currentNightDeathReveal, setCurrentNightDeathReveal] =
    useState<NightDeathReveal | null>(null);
  const [currentEliminationResult, setCurrentEliminationResult] =
    useState<EliminationResult | null>(null);

  const [role, setRole] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(true);
  const [gameHostUserId, setGameHostUserId] = useState<string | null>(null);
  const [canWriteNotebook, setCanWriteNotebook] = useState<boolean>(true);

  const [werewolfUserIds, setWerewolfUserIds] = useState<string[]>([]);
  const [hunterShotsRemaining, setHunterShotsRemaining] = useState<number>(0);
  const [trapperAlertsRemaining, setTrapperAlertsRemaining] = useState<number>(0);
  const [trapperAlertActive, setTrapperAlertActive] = useState<boolean>(false);
  const [doctorSelfProtectUsed, setDoctorSelfProtectUsed] = useState<boolean>(false);
  const [executionerTargetName, setExecutionerTargetName] = useState<string | null>(null);
  const [executionerTargetUserId, setExecutionerTargetUserId] = useState<string | null>(null);

  /* ---------------------------------------------------------------------------
     UI-only state
  --------------------------------------------------------------------------- */

  const [viewingNotebook, setViewingNotebook] = useState<NotebookView | null>(null);
  const [selectedNightActionTargetId, setSelectedNightActionTargetId] =
    useState<string | null>(null);
  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState<string | null>(null);

  /* ---------------------------------------------------------------------------
     applyCommonSnapshot(game)

     Applies the subset of snapshot fields that we want to re-sync frequently
     (role state, selections, per-role resources).

     Used on:
     - initial load
     - lobby realtime updates (refresh/reconnect resilience)
  --------------------------------------------------------------------------- */
  const applyCommonSnapshot = useCallback((game: GameSnapshot) => {
    setRole(game.role);
    setCanWriteNotebook(game.canWriteNotebook);
    setWerewolfUserIds(game.werewolfUserIds ?? []);
    setHunterShotsRemaining(game.hunterShotsRemaining ?? 0);
    setTrapperAlertsRemaining(game.trapperAlertsRemaining ?? 0);
    setTrapperAlertActive(game.trapperAlertActive ?? false);
    setDoctorSelfProtectUsed(game.doctorSelfProtectUsed ?? false);
    setSelectedNightActionTargetId(getSelectedNightTargetUserId(game));
    setExecutionerTargetName(game.executionerTargetName ?? null);
    setExecutionerTargetUserId(game.executionerTargetUserId ?? null);
    setGameHostUserId(game.hostUserId);
  }, []);

  /* ---------------------------------------------------------------------------
     applyFullSnapshot(game)

     Applies the full game snapshot including phase timing + reveal state.
     Typically only needed on the first load (or a full refresh).
  --------------------------------------------------------------------------- */
  const applyFullSnapshot = useCallback((game: GameSnapshot) => {
    setGameStarted(game.started);
    setPhase(game.phase);
    setDayNumber(game.dayNumber);
    setNightNumber(game.nightNumber);
    setPhaseEndsAt(game.phaseEndsAt);
    setCurrentNightDeathReveal(game.currentNightDeathReveal ?? null);
    setCurrentEliminationResult(game.currentEliminationResult ?? null);
    applyCommonSnapshot(game);
  }, [applyCommonSnapshot]);

  useEffect(() => {
    if (!lobbyName) return;

    /* -------------------------------------------------------------------------
       Initial authoritative snapshot
    ------------------------------------------------------------------------- */

    initGame(lobbyName, (response: GameInitResponse) => {
      if (!response?.ok || !response.game) {
        console.error(response?.error ?? 'Failed to initialize game');
        return;
      }
      applyFullSnapshot(response.game);
    });
  }, [applyFullSnapshot, lobbyName]);

  useEffect(() => {
    if (!lobbyName || !lobbyInfo) return;

    /* -------------------------------------------------------------------------
       Refresh common fields (throttled by a lobby-derived key)

       `lobbyInfo` updates frequently (presence counts, timers, etc.). Calling
       `game:init` on *every* lobby snapshot can spam the server and produce
       noisy logs.

       We only re-fetch the game snapshot when a "game-relevant" lobby field
       changes (phase transitions, reveals, round numbers). This still keeps
       role-specific state accurate across refreshes/reconnects without
       over-requesting.
    ------------------------------------------------------------------------- */

    const eliminationKey =
      lobbyInfo.currentEliminationResult?.noElimination === true
        ? 'none'
        : lobbyInfo.currentEliminationResult &&
            'userId' in lobbyInfo.currentEliminationResult
          ? lobbyInfo.currentEliminationResult.userId
          : 'waiting';

    const nextKey = [
      lobbyInfo.started ? '1' : '0',
      lobbyInfo.gamePhase,
      lobbyInfo.dayNumber ?? 'null',
      lobbyInfo.nightNumber ?? 'null',
      lobbyInfo.phaseEndsAt ?? 'null',
      lobbyInfo.currentNightDeathReveal?.userId ?? 'none',
      eliminationKey,
    ].join('|');

    if (lastLobbySyncKeyRef.current === nextKey) return;
    lastLobbySyncKeyRef.current = nextKey;

    initGame(lobbyName, (response: GameInitResponse) => {
      if (!response?.ok || !response.game) return;
      applyCommonSnapshot(response.game);
    });
  }, [applyCommonSnapshot, lobbyInfo, lobbyName]);

  const started = lobbyInfo?.started ?? gameStarted;
  const currentPhase = lobbyInfo?.gamePhase ?? phase;
  const effectiveDisplayPhase: GamePhase =
    currentPhase === 'nightActionResults' ? 'night' : currentPhase;

  useEffect(() => {
    if (!lobbyName) return;
    if (lobbyInfo?.gamePhase !== 'gameResults') return;
    if (navigatedToResultsRef.current) return;
    navigatedToResultsRef.current = true;

    // Give the results overlay time to fade out before route transition.
    const id = setTimeout(() => {
      navigation.replace(resultsPath(lobbyName));
    }, 900);
    return () => clearTimeout(id);
  }, [lobbyInfo?.gamePhase, lobbyName, navigation]);

  useEffect(() => {
    if (effectiveDisplayPhase === 'day' || effectiveDisplayPhase === 'night') return;
    const id = setTimeout(() => {
      setViewingNotebook(null);
    }, 0);
    return () => clearTimeout(id);
  }, [effectiveDisplayPhase]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (currentPhase !== 'vote') setSelectedVoteTargetId(null);
      if (effectiveDisplayPhase !== 'night') setSelectedNightActionTargetId(null);
    }, 0);
    return () => clearTimeout(id);
  }, [currentPhase, effectiveDisplayPhase]);

  useEffect(() => {
    if (started) return;
    if (!lobbyName) return;
    if (lobbyInfo?.startingAt) return;
    navigation.push(lobbyPath(lobbyName));
  }, [lobbyInfo?.startingAt, navigation, lobbyName, started]);

  return useMemo(
    () => ({
      nowMs,
      started,
      effectiveDisplayPhase,

      // server-derived state
      phase,
      dayNumber,
      nightNumber,
      phaseEndsAt,
      currentNightDeathReveal,
      currentEliminationResult,
      role,
      gameStarted,
      gameHostUserId,
      canWriteNotebook,
      werewolfUserIds,
      hunterShotsRemaining,
      trapperAlertsRemaining,
      trapperAlertActive,
      doctorSelfProtectUsed,
      executionerTargetName,
      executionerTargetUserId,

      // ui state
      viewingNotebook,
      setViewingNotebook,
      selectedNightActionTargetId,
      setSelectedNightActionTargetId,
      selectedVoteTargetId,
      setSelectedVoteTargetId,
    }),
    [
      canWriteNotebook,
      currentEliminationResult,
      currentNightDeathReveal,
      dayNumber,
      doctorSelfProtectUsed,
      effectiveDisplayPhase,
      executionerTargetName,
      executionerTargetUserId,
      gameHostUserId,
      gameStarted,
      hunterShotsRemaining,
      nightNumber,
      nowMs,
      phase,
      phaseEndsAt,
      role,
      selectedNightActionTargetId,
      selectedVoteTargetId,
      started,
      trapperAlertActive,
      trapperAlertsRemaining,
      viewingNotebook,
      werewolfUserIds,
    ],
  );
}
