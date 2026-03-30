export type LobbyMember = {
  userId: string;
  name: string;
  alive: boolean;
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
};

export type GameResultsPlayer = {
  userId: string;
  name: string;
  role: string | null;
  faction: 'Village' | 'Enemy' | 'Neutral' | null;
  alive: boolean;
  eliminationSummary: string | null;
};

export type GameResults = {
  winningFaction: 'Village' | 'Enemy' | 'Executioner' | 'Jester';
  endedAt: number;
  players: GameResultsPlayer[];
};

export type EliminationResult =
  | {
      userId: string;
      name: string;
      notebook: string;
      voteCount: number;
      noElimination: false;
    }
  | {
      noElimination: true;
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
  phaseDurations?: LobbyPhaseDurations;
};

export type LobbySettingsProps = {
  isHost: boolean;
  werewolfCount: number;
  specialRolesEnabled: boolean;
  neutralRolesEnabled: boolean;
  phaseDurations: LobbyPhaseDurations;
  onWerewolfChange: (count: number) => void;
  onSpecialRolesEnabledChange: (enabled: boolean) => void;
  onNeutralRolesEnabledChange: (enabled: boolean) => void;
  onPhaseChange: (next: LobbyPhaseDurations) => void;
};
