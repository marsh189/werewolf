import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveNightAndStartResults } from './nightResolutionService.js';

const createIo = () => ({
  emit: vi.fn(),
  to: vi.fn(() => ({
    emit: vi.fn(),
  })),
});

const createLobby = ({
  roles = {},
  roleState = {},
  werewolfTargetId = null,
  werewolfActorUserId = null,
  hunterTargets = [],
  doctorTargets = [],
  trapperAlertUserIds = [],
} = {}) => ({
  name: 'test-lobby',
  started: true,
  gamePhase: 'night',
  nightNumber: 1,
  members: new Map(
    Object.keys(roles).map((userId) => [
      userId,
      { userId, name: userId.toUpperCase() },
    ]),
  ),
  playerRoles: new Map(Object.entries(roles)),
  playerRoleState: new Map(Object.entries(roleState)),
  eliminatedUserIds: new Set(),
  eliminationInfoByUserId: new Map(),
  pendingNightDeathReveals: [],
  playerNotebooks: new Map(),
  pendingWerewolfKillTargetId: werewolfTargetId,
  pendingWerewolfKillActorUserId: werewolfActorUserId,
  pendingAlphaWolfKillTargetId: null,
  pendingHunterKillTargets: new Map(hunterTargets),
  pendingTrapperAlertUserIds: new Set(trapperAlertUserIds),
  pendingEscortVisitTargets: new Map(),
  pendingBodyguardGuardTargets: new Map(),
  pendingDoctorProtectTargets: new Map(doctorTargets),
  pendingTrackerWatchTargets: new Map(),
  pendingLookoutWatchTargets: new Map(),
  pendingInvestigatorVisitTargets: new Map(),
  pendingFramerTargets: new Map(),
  pendingProwlerTargets: new Map(),
  pendingSnatcherTargets: new Map(),
  pendingCursedTargets: new Map(),
  pendingMimicTargets: new Map(),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveNightAndStartResults', () => {
  it('prevents a werewolf kill when the doctor protects the target', () => {
    const io = createIo();
    const lobby = createLobby({
      roles: {
        wolf: 'Werewolf',
        doctor: 'Doctor',
        target: 'Villager',
      },
      werewolfActorUserId: 'wolf',
      werewolfTargetId: 'target',
      doctorTargets: [['doctor', 'target']],
    });
    const startNightActionResultsPhase = vi.fn();

    resolveNightAndStartResults(io, lobby, startNightActionResultsPhase);

    expect(lobby.eliminatedUserIds.size).toBe(0);
    expect(lobby.pendingNightDeathReveals).toHaveLength(0);
    expect(startNightActionResultsPhase).toHaveBeenCalledOnce();
  });

  it('kills the hunter from guilt after they shoot a village role', () => {
    const io = createIo();
    const lobby = createLobby({
      roles: {
        hunter: 'Hunter',
        target: 'Villager',
      },
      roleState: {
        hunter: { hunterShotsRemaining: 3 },
      },
      hunterTargets: [['hunter', 'target']],
    });

    resolveNightAndStartResults(io, lobby, vi.fn());

    expect(lobby.eliminatedUserIds.has('hunter')).toBe(true);
    expect(lobby.eliminatedUserIds.has('target')).toBe(true);
    expect(lobby.playerRoleState.get('hunter')?.hunterShotsRemaining).toBe(2);
  });

  it('converts an executioner into a jester when their target dies at night', () => {
    const io = createIo();
    const lobby = createLobby({
      roles: {
        wolf: 'Werewolf',
        executioner: 'Executioner',
        target: 'Villager',
      },
      roleState: {
        executioner: { executionerTargetUserId: 'target' },
      },
      werewolfActorUserId: 'wolf',
      werewolfTargetId: 'target',
    });

    resolveNightAndStartResults(io, lobby, vi.fn());

    expect(lobby.eliminatedUserIds.has('target')).toBe(true);
    expect(lobby.playerRoles.get('executioner')).toBe('Jester');
    expect(
      lobby.playerRoleState.get('executioner')?.executionerTargetUserId,
    ).toBe(null);
  });

  it('kills a werewolf who attacks an alerted trapper', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const io = createIo();
    const lobby = createLobby({
      roles: {
        wolf: 'Werewolf',
        trapper: 'Trapper',
      },
      roleState: {
        trapper: { trapperAlertsRemaining: 3 },
      },
      werewolfActorUserId: 'wolf',
      werewolfTargetId: 'trapper',
      trapperAlertUserIds: ['trapper'],
    });

    resolveNightAndStartResults(io, lobby, vi.fn());

    expect(randomSpy).toHaveBeenCalled();
    expect(lobby.eliminatedUserIds.has('wolf')).toBe(true);
    expect(lobby.eliminatedUserIds.has('trapper')).toBe(false);
    expect(lobby.pendingNightDeathReveals[0]?.userId).toBe('wolf');
  });
});
