import type { EliminationResult, NightDeathReveal } from '@/models/lobby';

export type GamePhase =
  | 'lobby'
  | 'roleReveal'
  | 'day'
  | 'night'
  | 'nightResults'
  | 'vote'
  | 'eliminationResults';

export type GameInitResponse = {
  ok: boolean;
  error?: string;
  game?: {
    started: boolean;
    phase: GamePhase;
    dayNumber: number | null;
    nightNumber: number | null;
    phaseEndsAt: number | null;
    currentNightDeathReveal: NightDeathReveal | null;
    currentEliminationResult: EliminationResult | null;
    role: string | null;
    werewolfUserIds: string[];
    hostUserId: string;
    canWriteNotebook: boolean;
  };
};

export type SocketAck = {
  ok: boolean;
  error?: string;
};

export type NotebookView = {
  name: string;
  content: string;
};

export type NotebookResponse = {
  ok: boolean;
  notebook?: NotebookView;
};

export type NightResultRevealState =
  | 'hidden'
  | 'heading'
  | 'line1'
  | 'line2'
  | 'notebook'
  | 'fading';

export type RoleRevealState =
  | 'hidden'
  | 'titlePre'
  | 'title'
  | 'rolePre'
  | 'role'
  | 'fading';
