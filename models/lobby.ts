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
  extraRoles: string[];
  phaseDurations: LobbyPhaseDurations;
  gamePhase:
    | 'lobby'
    | 'roleReveal'
    | 'day'
    | 'night'
    | 'nightResults'
    | 'vote'
    | 'eliminationResults';
  dayNumber: number | null;
  nightNumber: number | null;
  phaseEndsAt: number | null;
  currentNightDeathReveal: NightDeathReveal | null;
  currentEliminationResult: EliminationResult | null;
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
  extraRoles: string[];
  phaseDurations?: LobbyPhaseDurations;
};

export type LobbySettingsProps = {
  isHost: boolean;
  werewolfCount: number;
  extraRoles: string[];
  phaseDurations: LobbyPhaseDurations;
  onWerewolfChange: (count: number) => void;
  onAddRole: (role: string) => void;
  onRemoveRole: (role: string) => void;
  onPhaseChange: (next: LobbyPhaseDurations) => void;
};
