'use client';

import EndGameScene from '@/components/game/EndGameScene';
import GameStartingScene from '@/components/game/GameStartingScene';
import NightResultsScene from '@/components/game/NightResultsScene';
import RoleRevealScene from '@/components/game/RoleRevealScene';
import type {
  GamePhase,
  NightResultRevealState,
  RoleRevealState,
} from '@/models/game';
import type { NightDeathReveal } from '@/models/lobby';

type GamePhaseSceneProps = {
  currentPhase: GamePhase;
  startingAt: number | null | undefined;
  startingRemainingSeconds: number | null;
  phaseEndsAt: number | null;
  revealState: RoleRevealState;
  roleName: string;
  roleToneClass: string;
  nightResultRevealState: NightResultRevealState;
  revealDeath: NightDeathReveal | null;
  didWin: boolean | null;
  winningFaction: 'Village' | 'Enemy' | 'Executioner' | 'Jester' | null;
};

export default function GamePhaseScene({
  currentPhase,
  startingAt,
  startingRemainingSeconds,
  phaseEndsAt,
  revealState,
  roleName,
  roleToneClass,
  nightResultRevealState,
  revealDeath,
  didWin,
  winningFaction,
}: GamePhaseSceneProps) {
  if (currentPhase === 'lobby' && startingAt) {
    return <GameStartingScene startingRemainingSeconds={startingRemainingSeconds} />;
  }

  if (currentPhase === 'roleReveal') {
    return (
      <RoleRevealScene
        phaseEndsAt={phaseEndsAt}
        revealState={revealState}
        roleName={roleName}
        roleToneClass={roleToneClass}
      />
    );
  }

  if (currentPhase === 'nightResults') {
    return (
      <NightResultsScene
        revealState={nightResultRevealState}
        revealDeath={revealDeath}
      />
    );
  }

  if (currentPhase === 'endGame') {
    return <EndGameScene didWin={didWin} winningFaction={winningFaction} />;
  }

  if (currentPhase === 'gameResults') {
    return <div className="game-cinematic-scene min-h-[100svh]" />;
  }

  return null;
}
