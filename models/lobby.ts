export type LobbyMember = {
  userId: string;
  name: string;
  alive: boolean;
  voteCount?: number;
};

export type LobbyPhaseDurations = {
  daySeconds: number;
  nightSeconds: number;
  voteSeconds: number;
};

export type NightDeathReveal = {
  userId: string;
  name: string;
  notebook: string;
  role: string | null;
  faction: 'Village' | 'Enemy' | 'Neutral' | null;
  eliminationSummary: string | null;
  nightNumber: number | null;
};

export type VoteRevealVoter = {
  userId: string;
  name: string;
};

export type VoteRevealBallot = {
  voterUserId: string;
  voterName: string;
  targetUserId: string;
  targetName: string;
};

export type GameResultsPlayer = {
  userId: string;
  name: string;
  role: string | null;
  faction: 'Village' | 'Enemy' | 'Neutral' | null;
  alive: boolean;
  eliminationSummary: string | null;
};

export type GameResultsStats = {
  totalPlayers: number;
  survivingPlayers: number;
  totalDeaths: number;
  villagePlayers: number;
  enemyPlayers: number;
  neutralPlayers: number;
};

export type GameTimelineEvent = {
  id: string;
  phase: 'night' | 'vote';
  roundNumber: number | null;
  title: string;
  description: string;
  tone: 'danger' | 'neutral' | 'success';
  affectedUserIds: string[];
  affectedNames: string[];
};

export type GameResults = {
  winningFaction: 'Village' | 'Enemy' | 'Executioner' | 'Jester';
  endedAt: number;
  stats: GameResultsStats;
  players: GameResultsPlayer[];
  timeline: GameTimelineEvent[];
};

export type EliminationResult =
  | {
      userId: string;
      name: string;
      notebook: string;
      role: string | null;
      faction: 'Village' | 'Enemy' | 'Neutral' | null;
      eliminationSummary: string | null;
      voteCount: number;
      totalVotes: number;
      voters: VoteRevealVoter[];
      ballotSummary: VoteRevealBallot[];
      noElimination: false;
    }
  | {
      noElimination: true;
      totalVotes: number;
      tiedTargetNames: string[];
    };

export type LobbyView = {
  lobbyName: string;
  hostUserId: string;
  members: LobbyMember[];
  started: boolean;
  startingAt: number | null;
  werewolfCount: number;
  specialRolesEnabled: boolean;
  neutralRolesEnabled: boolean;
  roleRevealOnElimination: boolean;
  phaseDurations: LobbyPhaseDurations;
  gamePhase:
    | 'lobby'
    | 'roleReveal'
    | 'day'
    | 'night'
    | 'nightActionResults'
    | 'nightResults'
    | 'vote'
    | 'eliminationResults'
    | 'endGame'
    | 'gameResults';
  dayNumber: number | null;
  nightNumber: number | null;
  phaseEndsAt: number | null;
  currentNightDeathReveal: NightDeathReveal | null;
  currentEliminationResult: EliminationResult | null;
  gameResults: GameResults | null;
};

export type LobbyListItem = {
  lobbyName: string;
  hostUserId: string;
  memberCount: number;
  started: boolean;
};

export type OpenLobby = LobbyListItem & {
  cap: number | null;
};

export type ListAck<T> =
  | { ok: true; lobbies: T[] }
  | { ok: false; error?: string };

export type JoinAck =
  | { ok: true; lobbyName: string }
  | { ok: false; error?: string };

export type CreateAck = JoinAck;

export type LobbySettingsUpdate = {
  werewolfCount: number;
  specialRolesEnabled: boolean;
  neutralRolesEnabled: boolean;
  roleRevealOnElimination: boolean;
  phaseDurations?: LobbyPhaseDurations;
};

export type LobbySettingsProps = {
  isHost: boolean;
  werewolfCount: number;
  specialRolesEnabled: boolean;
  neutralRolesEnabled: boolean;
  roleRevealOnElimination: boolean;
  phaseDurations: LobbyPhaseDurations;
  onWerewolfChange: (count: number) => void;
  onSpecialRolesEnabledChange: (enabled: boolean) => void;
  onNeutralRolesEnabledChange: (enabled: boolean) => void;
  onRoleRevealOnEliminationChange: (enabled: boolean) => void;
  onPhaseChange: (next: LobbyPhaseDurations) => void;
};
