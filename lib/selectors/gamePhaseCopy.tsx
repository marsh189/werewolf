import type { ReactNode } from 'react';
import type { GamePhase } from '@/models/game';
import { ROLES, type NightInstructionContext, type Role } from '@/models/roles';

type ResolvedRoleInfo = (typeof ROLES)[Role] | null;

type GamePhaseCopyParams = {
  effectiveDisplayPhase: GamePhase;
  currentDayNumber: number | null;
  currentNightNumber: number | null;
  selfAlive: boolean;
  roleName: string;
  roleInfo: ResolvedRoleInfo;
  hunterShotsRemaining: number | null;
  trapperAlertsRemaining: number | null;
  trapperAlertActive: boolean;
};

type GamePhaseCopy = {
  phaseTitle: string;
  phaseSubLabel: string | null;
  phaseSubInstruction: string | null;
  instructionNode: ReactNode;
};

function getNightInstruction({
  selfAlive,
  roleInfo,
  hunterShotsRemaining,
  trapperAlertsRemaining,
  trapperAlertActive,
}: Pick<
  GamePhaseCopyParams,
  | 'selfAlive'
  | 'roleInfo'
  | 'hunterShotsRemaining'
  | 'trapperAlertsRemaining'
  | 'trapperAlertActive'
>) {
  if (!selfAlive) return 'You are dead. You cannot act, but you can observe.';

  const nightInstructionContext: NightInstructionContext = {
    hunterShotsRemaining: hunterShotsRemaining ?? undefined,
    trapperAlertsRemaining: trapperAlertsRemaining ?? undefined,
    trapperAlertActive,
  };

  if (typeof roleInfo?.nightInstruction === 'function') {
    return roleInfo.nightInstruction(nightInstructionContext);
  }

  return roleInfo?.nightInstruction ?? 'You have no night action tonight.';
}

function highlightNightInstruction(roleName: string, instruction: string): ReactNode {
  const highlightFromMarkerToEnd = (marker: string) => {
    const idx = instruction.indexOf(marker);
    if (idx === -1) return null;
    const before = instruction.slice(0, idx).trimEnd();
    const after = instruction.slice(idx);
    return (
      <>
        <span>{before} </span>
        <span className="text-sky-300 font-semibold">{after}</span>
      </>
    );
  };

  const highlightExactSentence = (sentence: string) => {
    const idx = instruction.indexOf(sentence);
    if (idx === -1) return null;
    const before = instruction.slice(0, idx).trimEnd();
    const after = instruction.slice(idx + sentence.length).trimStart();
    return (
      <>
        {before ? <span>{before} </span> : null}
        <span className="text-sky-300 font-semibold">{sentence}</span>
        {after ? <span> {after}</span> : null}
      </>
    );
  };

  if (roleName === 'Hunter') {
    return highlightFromMarkerToEnd('Shots remaining:') ?? instruction;
  }

  if (roleName === 'Trapper') {
    return highlightFromMarkerToEnd('Alerts remaining:') ?? instruction;
  }

  if (roleName === 'Doctor') {
    return (
      highlightExactSentence('You may protect yourself once per game.') ??
      instruction
    );
  }

  return instruction;
}

export function getGamePhaseCopy({
  effectiveDisplayPhase,
  currentDayNumber,
  currentNightNumber,
  selfAlive,
  roleName,
  roleInfo,
  hunterShotsRemaining,
  trapperAlertsRemaining,
  trapperAlertActive,
}: GamePhaseCopyParams): GamePhaseCopy {
  const phaseTitle =
    effectiveDisplayPhase === 'day' ||
    effectiveDisplayPhase === 'vote' ||
    effectiveDisplayPhase === 'eliminationResults'
      ? `Day ${currentDayNumber ?? 0}`
      : effectiveDisplayPhase === 'night'
        ? `Night ${currentNightNumber ?? 1}`
        : 'Game';

  const phaseSubLabel =
    effectiveDisplayPhase === 'day'
      ? 'The village gathers by torchlight.'
      : effectiveDisplayPhase === 'vote'
        ? 'Whispers turn to accusations.'
        : effectiveDisplayPhase === 'eliminationResults'
          ? 'The village passes judgment.'
          : effectiveDisplayPhase === 'night'
            ? 'Shadows deepen and choices are made in secret.'
            : null;

  const nightInstruction = getNightInstruction({
    selfAlive,
    roleInfo,
    hunterShotsRemaining,
    trapperAlertsRemaining,
    trapperAlertActive,
  });

  const phaseSubInstruction =
    effectiveDisplayPhase === 'day'
      ? (currentDayNumber ?? 0) === 0
        ? 'Steel your nerves. The first night is coming.'
        : 'Discuss what happened last night and share suspicions.'
      : effectiveDisplayPhase === 'vote'
        ? 'Cast your vote for the player you believe is a werewolf.'
        : effectiveDisplayPhase === 'eliminationResults'
          ? 'Review the outcome and prepare for the coming night.'
          : effectiveDisplayPhase === 'night'
            ? nightInstruction
            : null;

  const instructionNode =
    effectiveDisplayPhase === 'night' && phaseSubInstruction
      ? highlightNightInstruction(roleName, phaseSubInstruction)
      : phaseSubInstruction;

  return {
    phaseTitle,
    phaseSubLabel,
    phaseSubInstruction,
    instructionNode,
  };
}
