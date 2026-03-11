import type { EliminationResult, NightDeathReveal } from '@/models/lobby';

export type GamePhase =
  | 'lobby'
  | 'roleReveal'
  | 'day'
  | 'night'
  | 'nightActionResults'
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
    hunterShotsRemaining: number | null;
    trapperAlertsRemaining: number | null;
    trapperAlertActive: boolean;
    nightKillTargetUserId: string | null;
    escortVisitTargetUserId: string | null;
    bodyguardGuardTargetUserId: string | null;
    doctorProtectTargetUserId: string | null;
    doctorSelfProtectUsed: boolean | null;
    trackerWatchTargetUserId: string | null;
    lookoutWatchTargetUserId: string | null;
    investigatorVisitTargetUserId: string | null;
    framerTargetUserId: string | null;
    prowlerTargetUserId: string | null;
    snatcherTargetUserId: string | null;
    cursedTargetUserId: string | null;
    mimicTargetUserId: string | null;
    executionerTargetUserId: string | null;
    executionerTargetName: string | null;
    hostUserId: string;
    canWriteNotebook: boolean;
  };
};

export type SocketAck = {
  ok: boolean;
  error?: string;
};

export type ChatChannel = 'village';
export type ChatAudience = 'village' | 'werewolf' | 'dead';

export type ChatMessage = {
  id: string;
  channel: ChatChannel;
  audience: ChatAudience;
  recipientUserIds?: string[];
  tone?: 'default' | 'death';
  userId: string;
  name: string;
  content: string;
  sentAt: number;
};

export type ChatState = {
  channels: ChatChannel[];
  canSend: Partial<Record<ChatChannel, boolean>>;
  history: Partial<Record<ChatChannel, ChatMessage[]>>;
};

export type ChatInitResponse = {
  ok: boolean;
  error?: string;
  chat?: ChatState;
};

export type ChatSendResponse = SocketAck & {
  throttled?: boolean;
  message?: ChatMessage;
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
