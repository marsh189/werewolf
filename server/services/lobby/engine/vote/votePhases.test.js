import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVotePhases } from './votePhases.js';

const createIo = () => ({
  emit: vi.fn(),
  to: vi.fn(() => ({
    emit: vi.fn(),
  })),
});

const createLobby = ({
  roles = {},
  roleState = {},
  dayNumber = 1,
} = {}) => ({
  name: 'vote-test-lobby',
  started: true,
  gamePhase: 'day',
  dayNumber,
  nightNumber: 0,
  phaseDurations: {
    voteSeconds: 1,
  },
  members: new Map(
    Object.keys(roles).map((userId) => [userId, { userId, name: userId.toUpperCase() }]),
  ),
  playerRoles: new Map(Object.entries(roles)),
  playerRoleState: new Map(Object.entries(roleState)),
  eliminatedUserIds: new Set(),
  publicEliminatedUserIds: new Set(),
  playerNotebooks: new Map(),
  eliminationInfoByUserId: new Map(),
  roundRecapEvents: [],
  currentVotes: new Map(),
  currentNightDeathReveal: null,
  currentEliminationResult: null,
  gameResults: null,
  roleRevealOnElimination: true,
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('createVotePhases', () => {
  it('triggers a jester win when the jester is voted out', () => {
    vi.useFakeTimers();
    const io = createIo();
    const lobby = createLobby({
      roles: {
        jester: 'Jester',
        villager: 'Villager',
        wolf: 'Werewolf',
      },
    });
    const getStartNightPhase = vi.fn(() => vi.fn());
    const { startVotePhase } = createVotePhases({ getStartNightPhase });

    startVotePhase(io, lobby);
    lobby.currentVotes.set('villager', 'jester');
    lobby.currentVotes.set('wolf', 'jester');

    vi.advanceTimersByTime(1000);

    expect(lobby.gamePhase).toBe('eliminationResults');
    expect(lobby.currentEliminationResult?.userId).toBe('jester');

    vi.advanceTimersByTime(11000);

    expect(lobby.gameResults?.winningFaction).toBe('Jester');
    expect(lobby.gamePhase).toBe('endGame');
    expect(getStartNightPhase).not.toHaveBeenCalled();
  });

  it('triggers an executioner win when their target is voted out', () => {
    vi.useFakeTimers();
    const io = createIo();
    const lobby = createLobby({
      roles: {
        executioner: 'Executioner',
        target: 'Villager',
        wolf: 'Werewolf',
      },
      roleState: {
        executioner: { executionerTargetUserId: 'target' },
      },
    });
    const getStartNightPhase = vi.fn(() => vi.fn());
    const { startVotePhase } = createVotePhases({ getStartNightPhase });

    startVotePhase(io, lobby);
    lobby.currentVotes.set('executioner', 'target');
    lobby.currentVotes.set('wolf', 'target');

    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(11000);

    expect(lobby.gameResults?.winningFaction).toBe('Executioner');
    expect(lobby.eliminatedUserIds.has('target')).toBe(true);
    expect(getStartNightPhase).not.toHaveBeenCalled();
  });

  it('keeps the game moving to night when the vote is tied', () => {
    vi.useFakeTimers();
    const io = createIo();
    const lobby = createLobby({
      roles: {
        alpha: 'AlphaWolf',
        villagerA: 'Villager',
        villagerB: 'Villager',
      },
    });
    const startNightPhase = vi.fn();
    const getStartNightPhase = vi.fn(() => startNightPhase);
    const { startVotePhase } = createVotePhases({ getStartNightPhase });

    startVotePhase(io, lobby);
    lobby.currentVotes.set('alpha', 'villagerA');
    lobby.currentVotes.set('villagerA', 'alpha');

    vi.advanceTimersByTime(1000);

    expect(lobby.gamePhase).toBe('eliminationResults');
    expect(lobby.currentEliminationResult).toEqual({
      noElimination: true,
      totalVotes: 2,
      tiedTargetNames: ['ALPHA', 'VILLAGERA'],
    });

    vi.advanceTimersByTime(11000);

    expect(lobby.gameResults).toBe(null);
    expect(startNightPhase).toHaveBeenCalledWith(io, lobby, 1);
    expect(lobby.eliminatedUserIds.size).toBe(0);
  });

  it('triggers an enemy win after the vote when werewolves reach parity', () => {
    vi.useFakeTimers();
    const io = createIo();
    const lobby = createLobby({
      roles: {
        wolf: 'Werewolf',
        villagerA: 'Villager',
        villagerB: 'Villager',
      },
    });
    const startNightPhase = vi.fn();
    const getStartNightPhase = vi.fn(() => startNightPhase);
    const { startVotePhase } = createVotePhases({ getStartNightPhase });

    startVotePhase(io, lobby);
    lobby.currentVotes.set('wolf', 'villagerA');
    lobby.currentVotes.set('villagerB', 'villagerA');

    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(11000);

    expect(lobby.gameResults?.winningFaction).toBe('Enemy');
    expect(startNightPhase).not.toHaveBeenCalled();
  });
});
