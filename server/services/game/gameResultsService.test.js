import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  maybeTriggerNeutralWinByVote,
  maybeTriggerVillageWin,
  maybeTriggerWerewolfWin,
} from './gameResultsService.js';

const createIo = () => ({
  emit: vi.fn(),
  to: vi.fn(() => ({
    emit: vi.fn(),
  })),
});

const createLobby = ({
  roles = {},
  roleState = {},
  eliminatedUserIds = [],
} = {}) => ({
  name: 'results-lobby',
  started: true,
  gamePhase: 'day',
  members: new Map(
    Object.keys(roles).map((userId) => [userId, { userId, name: userId }]),
  ),
  playerRoles: new Map(Object.entries(roles)),
  playerRoleState: new Map(Object.entries(roleState)),
  eliminatedUserIds: new Set(eliminatedUserIds),
  eliminationInfoByUserId: new Map(),
  roundRecapEvents: [],
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('game results win conditions', () => {
  it('triggers a jester win when the jester is voted out', () => {
    vi.useFakeTimers();
    const io = createIo();
    const lobby = createLobby({
      roles: {
        jester: 'Jester',
        villager: 'Villager',
      },
      eliminatedUserIds: ['jester'],
    });

    const triggered = maybeTriggerNeutralWinByVote(io, lobby, 'jester');

    expect(triggered).toBe(true);
    expect(lobby.gamePhase).toBe('endGame');
    expect(lobby.gameResults?.winningFaction).toBe('Jester');
  });

  it('triggers an executioner win when their target is voted out', () => {
    vi.useFakeTimers();
    const io = createIo();
    const lobby = createLobby({
      roles: {
        exec: 'Executioner',
        target: 'Villager',
        wolf: 'Werewolf',
      },
      roleState: {
        exec: { executionerTargetUserId: 'target' },
      },
      eliminatedUserIds: ['target'],
    });

    const triggered = maybeTriggerNeutralWinByVote(io, lobby, 'target');

    expect(triggered).toBe(true);
    expect(lobby.gameResults?.winningFaction).toBe('Executioner');
  });

  it('triggers a village win when no werewolves remain alive', () => {
    vi.useFakeTimers();
    const io = createIo();
    const lobby = createLobby({
      roles: {
        villager: 'Villager',
        doctor: 'Doctor',
        wolf: 'Werewolf',
      },
      eliminatedUserIds: ['wolf'],
    });

    const triggered = maybeTriggerVillageWin(io, lobby);

    expect(triggered).toBe(true);
    expect(lobby.gameResults?.winningFaction).toBe('Village');
  });

  it('triggers an enemy win when werewolves reach parity with all living non-enemy players', () => {
    vi.useFakeTimers();
    const io = createIo();
    const lobby = createLobby({
      roles: {
        wolfA: 'Werewolf',
        wolfB: 'AlphaWolf',
        villager: 'Villager',
        jester: 'Jester',
      },
    });

    const triggered = maybeTriggerWerewolfWin(io, lobby);

    expect(triggered).toBe(true);
    expect(lobby.gameResults?.winningFaction).toBe('Enemy');
  });

  it('does not trigger an enemy win while living villagers and neutrals still outnumber werewolves', () => {
    vi.useFakeTimers();
    const io = createIo();
    const lobby = createLobby({
      roles: {
        wolf: 'Werewolf',
        villager: 'Villager',
        jester: 'Jester',
      },
    });

    const triggered = maybeTriggerWerewolfWin(io, lobby);

    expect(triggered).toBe(false);
    expect(lobby.gameResults ?? null).toBe(null);
  });
});
