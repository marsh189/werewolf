'use client';

import type { GamePhase } from '@/models/game';
import { useCallback, useEffect, useRef } from 'react';

type SoundSpec = {
  type?: OscillatorType;
  frequency: number;
  durationMs: number;
  gain: number;
  delayMs?: number;
};

const START_COUNTDOWN_SOUND: SoundSpec[] = [
  { type: 'square', frequency: 587.33, durationMs: 55, gain: 0.032 },
  { type: 'square', frequency: 440, durationMs: 95, gain: 0.02, delayMs: 42 },
];

const NIGHT_KILL_SOUND: SoundSpec[] = [
  { type: 'sawtooth', frequency: 1174.66, durationMs: 42, gain: 0.028 },
  { type: 'square', frequency: 739.99, durationMs: 58, gain: 0.018, delayMs: 18 },
  { type: 'triangle', frequency: 293.66, durationMs: 120, gain: 0.012, delayMs: 62 },
];
const NIGHT_KILL_SOUND_ASSET_URL = '/sounds/killed.mp3';

const isPhaseWithSound = (phase: GamePhase) =>
  phase === 'day' || phase === 'night' || phase === 'vote';

export function useGameSoundEffects({
  currentPhase,
  startingAt,
  phaseEndsAt,
  canWriteNotebook,
}: {
  currentPhase: GamePhase;
  startingAt: number | null | undefined;
  phaseEndsAt?: number | null;
  canWriteNotebook?: boolean;
}) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioEnabledRef = useRef(false);
  const lastPhaseRef = useRef<GamePhase | null>(null);
  const lastStartingAtRef = useRef<number | null>(null);
  const lastCountdownSecondRef = useRef<number | null>(null);
  const lastPhaseCountdownKeyRef = useRef<string | null>(null);
  const previousCanWriteNotebookRef = useRef<boolean | null>(null);
  const nightKillAudioRef = useRef<HTMLAudioElement | null>(null);
  const canUseNightKillAssetRef = useRef<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) return;

    const unlockAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextCtor();
        }
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        audioEnabledRef.current = audioContextRef.current.state === 'running';
      } catch {
        audioEnabledRef.current = false;
      }
    };

    const onFirstInteraction = () => {
      void unlockAudio();
    };

    window.addEventListener('pointerdown', onFirstInteraction, { passive: true });
    window.addEventListener('keydown', onFirstInteraction);

    void unlockAudio();

    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (!audioContextRef.current) return;
      void audioContextRef.current.close();
      audioContextRef.current = null;
    };
  }, []);

  const playSpecs = (specs: SoundSpec[]) => {
    const context = audioContextRef.current;
    if (!context || !audioEnabledRef.current) return;

    const baseTime = context.currentTime;

    for (const spec of specs) {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const startAt = baseTime + (spec.delayMs ?? 0) / 1000;
      const endAt = startAt + spec.durationMs / 1000;

      oscillator.type = spec.type ?? 'sine';
      oscillator.frequency.setValueAtTime(spec.frequency, startAt);

      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(spec.gain, startAt + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(endAt + 0.02);
    }
  };

  const playNightKillSound = useCallback(() => {
    if (typeof window === 'undefined') {
      playSpecs(NIGHT_KILL_SOUND);
      return;
    }

    if (canUseNightKillAssetRef.current) {
      try {
        if (!nightKillAudioRef.current) {
          nightKillAudioRef.current = new Audio(NIGHT_KILL_SOUND_ASSET_URL);
          nightKillAudioRef.current.preload = 'auto';
          nightKillAudioRef.current.volume = 0.8;
        }

        const audio = nightKillAudioRef.current;
        audio.currentTime = 0;
        void audio.play().catch(() => {
          canUseNightKillAssetRef.current = false;
          playSpecs(NIGHT_KILL_SOUND);
        });
        return;
      } catch {
        canUseNightKillAssetRef.current = false;
      }
    }

    playSpecs(NIGHT_KILL_SOUND);
  }, []);

  useEffect(() => {
    if (!startingAt) {
      lastStartingAtRef.current = null;
      lastCountdownSecondRef.current = null;
      return;
    }

    if (lastStartingAtRef.current !== startingAt) {
      lastStartingAtRef.current = startingAt;
      lastCountdownSecondRef.current = null;
    }

    const tickCountdown = () => {
      const remainingMs = startingAt - Date.now();
      if (remainingMs <= 0) {
        lastCountdownSecondRef.current = null;
        return false;
      }

      const remainingSeconds = Math.ceil(remainingMs / 1000);
      if (lastCountdownSecondRef.current !== remainingSeconds) {
        lastCountdownSecondRef.current = remainingSeconds;
        playSpecs(START_COUNTDOWN_SOUND);
      }
      return true;
    };

    tickCountdown();

    const intervalId = window.setInterval(() => {
      const shouldContinue = tickCountdown();
      if (!shouldContinue) {
        window.clearInterval(intervalId);
      }
    }, 150);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [startingAt]);

  useEffect(() => {
    if (!phaseEndsAt || !isPhaseWithSound(currentPhase)) {
      lastPhaseCountdownKeyRef.current = null;
      return;
    }

    const countdownKey = `${currentPhase}|${phaseEndsAt}`;
    if (lastPhaseCountdownKeyRef.current !== countdownKey) {
      lastPhaseCountdownKeyRef.current = countdownKey;
    }

    const playedMarks = new Set<number>();

    const tickPhaseCountdown = () => {
      const remainingMs = phaseEndsAt - Date.now();
      if (remainingMs <= 0) {
        return false;
      }

      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      const shouldPlay =
        remainingSeconds === 5 ||
        remainingSeconds === 4 ||
        remainingSeconds === 3 ||
        remainingSeconds === 2 ||
        remainingSeconds === 1;

      if (shouldPlay && !playedMarks.has(remainingSeconds)) {
        playedMarks.add(remainingSeconds);
        playSpecs(START_COUNTDOWN_SOUND);
      }

      return true;
    };

    tickPhaseCountdown();

    const intervalId = window.setInterval(() => {
      const shouldContinue = tickPhaseCountdown();
      if (!shouldContinue) {
        window.clearInterval(intervalId);
      }
    }, 150);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentPhase, phaseEndsAt]);

  useEffect(() => {
    const previousPhase = lastPhaseRef.current;
    lastPhaseRef.current = currentPhase;

    if (!previousPhase) return;
    if (previousPhase === currentPhase) return;
    if (!isPhaseWithSound(currentPhase)) return;
  }, [currentPhase]);

  useEffect(() => {
    if (typeof canWriteNotebook !== 'boolean') return;

    const previousCanWriteNotebook = previousCanWriteNotebookRef.current;
    previousCanWriteNotebookRef.current = canWriteNotebook;

    if (previousCanWriteNotebook !== true || canWriteNotebook !== false) return;
    if (
      currentPhase !== 'nightActionResults' &&
      currentPhase !== 'eliminationResults'
    ) {
      return;
    }

    playNightKillSound();
  }, [canWriteNotebook, currentPhase, playNightKillSound]);
}
