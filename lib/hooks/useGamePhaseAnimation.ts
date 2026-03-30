'use client';

import type {
  GamePhase,
  NightResultRevealState,
  RoleRevealState,
} from '@/models/game';
import { useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Animation Timing Constants (ms)

   Centralized timing values so the animation hook and scenes stay consistent.
--------------------------------------------------------------------------- */
export const GAME_PHASE_ANIMATION_MS = {
  roleTitleLead: 1400,
  roleRevealHold: 3000,
  roleRevealPostPause: 1500,
  roleRevealFade: 700,
  fadeIn: 700,
  transitionKickoff: 30,
  nightResultsLine1Lead: 1100,
  nightResultsLine2Lead: 2200,
  nightResultsNotebookLead: 4200,
  nightResultsPostInfoPause: 3000,
  nightResultsFade: 700,
  phaseTransitionFade: 1200,
  nightResultsLineGap: 700,
} as const;

/* =============================================================================
   Phase Animation Hook

   This hook drives the "cinematic" feel of the game UI:
   - role reveal sequencing
   - night-results sequencing (multi-line + optional notebook reveal)
   - cross-phase fade overlays

   Important: the server is authoritative for phase timing (`phaseEndsAt`).
   The client uses those timestamps to schedule animations locally.
============================================================================= */

export function useGamePhaseAnimation({
  currentPhase,
  currentPhaseEndsAt,
  currentDayNumber,
  nightResultsSequenceKey,
  revealDeathUserId,
}: {
  currentPhase: GamePhase;
  currentPhaseEndsAt: number | null;
  currentDayNumber: number | null;
  nightResultsSequenceKey: string;
  revealDeathUserId: string | null;
}) {
  const [revealState, setRevealState] = useState<RoleRevealState>('hidden');
  const [nightResultRevealState, setNightResultRevealState] =
    useState<NightResultRevealState>('hidden');
  const [phaseOverlayState, setPhaseOverlayState] = useState<{
    mode: 'hidden' | 'fadeIn' | 'fadeOut';
    key: number;
  }>({
    mode: 'hidden',
    key: 0,
  });

  const lastNightResultsSequenceRef = useRef<string | null>(null);
  const previousPhaseRef = useRef<GamePhase | null>(null);

  useEffect(() => {
    /* -------------------------------------------------------------------------
       Role reveal sequencing
    ------------------------------------------------------------------------- */

    if (currentPhase !== 'roleReveal') {
      const resetId = setTimeout(() => {
        setRevealState('hidden');
      }, 0);
      return () => clearTimeout(resetId);
    }

    const showTitleId = setTimeout(() => {
      setRevealState('titlePre');
    }, 0);
    const showTitleFadeId = setTimeout(() => {
      setRevealState('title');
    }, GAME_PHASE_ANIMATION_MS.transitionKickoff);
    const showRoleId = setTimeout(() => {
      setRevealState('rolePre');
    }, GAME_PHASE_ANIMATION_MS.roleTitleLead);
    const showRoleFadeId = setTimeout(() => {
      setRevealState('role');
    }, GAME_PHASE_ANIMATION_MS.roleTitleLead + GAME_PHASE_ANIMATION_MS.transitionKickoff);

    const fadeOutDelay = currentPhaseEndsAt
      ? Math.max(0, currentPhaseEndsAt - Date.now() - GAME_PHASE_ANIMATION_MS.roleRevealFade)
      : GAME_PHASE_ANIMATION_MS.roleTitleLead +
        GAME_PHASE_ANIMATION_MS.roleRevealHold +
        GAME_PHASE_ANIMATION_MS.roleRevealPostPause;
    const fadeId = setTimeout(() => {
      setRevealState('fading');
    }, fadeOutDelay);

    return () => {
      clearTimeout(showTitleId);
      clearTimeout(showTitleFadeId);
      clearTimeout(showRoleId);
      clearTimeout(showRoleFadeId);
      clearTimeout(fadeId);
    };
  }, [currentPhase, currentPhaseEndsAt]);

  useEffect(() => {
    /* -------------------------------------------------------------------------
       Night results sequencing

       Uses `nightResultsSequenceKey` to avoid re-scheduling timers when we
       receive duplicate lobby snapshots for the same reveal.
    ------------------------------------------------------------------------- */

    if (currentPhase !== 'nightResults') {
      lastNightResultsSequenceRef.current = null;
      const resetId = setTimeout(() => {
        setNightResultRevealState('hidden');
      }, 0);
      return () => clearTimeout(resetId);
    }

    const scheduleKey = `${nightResultsSequenceKey}-${currentPhaseEndsAt ?? 'pending'}`;
    if (lastNightResultsSequenceRef.current === scheduleKey) {
      return;
    }
    lastNightResultsSequenceRef.current = scheduleKey;

    const resetToHiddenId = setTimeout(() => {
      setNightResultRevealState('hidden');
    }, 0);

    const now = Date.now();
    const safePhaseEndsAt =
      currentPhaseEndsAt ??
      now +
        GAME_PHASE_ANIMATION_MS.nightResultsNotebookLead +
        GAME_PHASE_ANIMATION_MS.nightResultsPostInfoPause;
    const transitionLeadMs = Math.max(
      GAME_PHASE_ANIMATION_MS.nightResultsFade,
      GAME_PHASE_ANIMATION_MS.phaseTransitionFade,
    );
    const transitionStartAt = safePhaseEndsAt - transitionLeadMs;
    const notebookAt = revealDeathUserId
      ? transitionStartAt - GAME_PHASE_ANIMATION_MS.nightResultsPostInfoPause
      : null;
    const desiredLine2At = now + GAME_PHASE_ANIMATION_MS.nightResultsLine2Lead;
    const line2At = notebookAt
      ? Math.min(desiredLine2At, notebookAt - GAME_PHASE_ANIMATION_MS.nightResultsLineGap)
      : desiredLine2At;
    const line1At = Math.min(
      now + GAME_PHASE_ANIMATION_MS.nightResultsLine1Lead,
      line2At - GAME_PHASE_ANIMATION_MS.nightResultsLineGap,
    );
    const headingAt = Math.min(now + GAME_PHASE_ANIMATION_MS.transitionKickoff, line1At - 400);

    const headingDelay = Math.max(0, headingAt - now);
    const line1Delay = Math.max(0, line1At - now);
    const line2Delay = Math.max(0, line2At - now);
    const notebookDelay = notebookAt ? Math.max(0, notebookAt - now) : null;

    const showHeadingId = setTimeout(() => {
      setNightResultRevealState('heading');
    }, headingDelay);
    const showLine1Id = setTimeout(() => {
      setNightResultRevealState('line1');
    }, line1Delay);
    const showLine2Id = setTimeout(() => {
      setNightResultRevealState('line2');
    }, line2Delay);
    const showNotebookId =
      revealDeathUserId && notebookDelay !== null
        ? setTimeout(() => {
            setNightResultRevealState('notebook');
          }, notebookDelay)
        : null;
    const fadeOutDelay = currentPhaseEndsAt
      ? Math.max(0, currentPhaseEndsAt - Date.now() - GAME_PHASE_ANIMATION_MS.nightResultsFade)
      : GAME_PHASE_ANIMATION_MS.nightResultsLine2Lead + 1200;
    const fadeId = setTimeout(() => {
      setNightResultRevealState('fading');
    }, fadeOutDelay);

    return () => {
      clearTimeout(resetToHiddenId);
      clearTimeout(showHeadingId);
      clearTimeout(showLine1Id);
      clearTimeout(showLine2Id);
      if (showNotebookId) {
        clearTimeout(showNotebookId);
      }
      clearTimeout(fadeId);
    };
  }, [currentPhase, currentPhaseEndsAt, nightResultsSequenceKey, revealDeathUserId]);

  useEffect(() => {
    /* -------------------------------------------------------------------------
       Fade-in overlay (on phase entry)
    ------------------------------------------------------------------------- */

    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = currentPhase;

    const skipFadeIn =
      ((previousPhase === 'day' &&
        currentPhase === 'vote' &&
        (currentDayNumber ?? 0) > 0) ||
        (previousPhase === 'night' && currentPhase === 'nightActionResults'));
    if (skipFadeIn) return;

    const startId = setTimeout(() => {
      setPhaseOverlayState((previous) => ({
        mode: 'fadeIn',
        key: previous.key + 1,
      }));
    }, 0);
    const endId = setTimeout(() => {
      setPhaseOverlayState((previous) =>
        previous.mode === 'fadeIn'
          ? { ...previous, mode: 'hidden' }
          : previous,
      );
    }, GAME_PHASE_ANIMATION_MS.phaseTransitionFade);

    return () => {
      clearTimeout(startId);
      clearTimeout(endId);
    };
  }, [currentDayNumber, currentPhase]);

  useEffect(() => {
    /* -------------------------------------------------------------------------
       Fade-out overlay (on phase exit)

       Some phases (day, night) intentionally do not fade out to keep the
       game flow snappy and reduce perceived "stutter" between snapshots.
    ------------------------------------------------------------------------- */

    if (!currentPhaseEndsAt) return;
    const skipFadeOut =
      (currentPhase === 'day' && (currentDayNumber ?? 0) > 0) ||
      currentPhase === 'night';
    if (skipFadeOut) return;

    // Start the fade when the timer would display "0" (sub-1s remaining),
    // rather than at "1". This avoids the fade appearing to begin early.
    const delay = Math.max(0, currentPhaseEndsAt - Date.now() - 999);
    const startId = setTimeout(() => {
      setPhaseOverlayState((previous) => ({
        mode: 'fadeOut',
        key: previous.key + 1,
      }));
    }, delay);

    return () => clearTimeout(startId);
  }, [currentDayNumber, currentPhase, currentPhaseEndsAt]);

  return { revealState, nightResultRevealState, phaseOverlayState };
}
