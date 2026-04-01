import { describe, expect, it } from 'vitest';
import { buildGameInitPayloadForUser } from './gameInitService.js';

const createLobby = ({
  roles = {},
  roleState = {},
  eliminatedUserIds = [],
  phase = 'night',
  pendingWerewolfKillTargetId = null,
  pendingDoctorProtectTargets = [],
  pendingMimicTargets = [],
  hostUserId = 'host',
} = {}) => ({
  started: true,
  gamePhase: phase,
  dayNumber: 2,
  nightNumber: 2,
  phaseEndsAt: 12345,
  currentNightDeathReveal: null,
  currentEliminationResult: null,
  hostUserId,
  members: new Map(
    Object.keys(roles).map((userId) => [userId, { userId, name: `${userId}-name` }]),
  ),
  playerRoles: new Map(Object.entries(roles)),
  playerRoleState: new Map(Object.entries(roleState)),
  eliminatedUserIds: new Set(eliminatedUserIds),
  pendingWerewolfKillTargetId,
  pendingAlphaWolfKillTargetId: null,
  pendingHunterKillTargets: new Map(),
  pendingEscortVisitTargets: new Map(),
  pendingBodyguardGuardTargets: new Map(),
  pendingDoctorProtectTargets: new Map(pendingDoctorProtectTargets),
  pendingTrackerWatchTargets: new Map(),
  pendingLookoutWatchTargets: new Map(),
  pendingInvestigatorVisitTargets: new Map(),
  pendingFramerTargets: new Map(),
  pendingProwlerTargets: new Map(),
  pendingSnatcherTargets: new Map(),
  pendingCursedTargets: new Map(),
  pendingMimicTargets: new Map(pendingMimicTargets),
  pendingTrapperAlertUserIds: new Set(),
});

describe('buildGameInitPayloadForUser', () => {
  it('exposes werewolf teammates and selected kill target to werewolf roles', () => {
    const lobby = createLobby({
      roles: {
        wolf: 'Werewolf',
        alpha: 'AlphaWolf',
        villager: 'Villager',
      },
      pendingWerewolfKillTargetId: 'villager',
    });

    const payload = buildGameInitPayloadForUser({ lobby, userId: 'wolf' });

    expect(payload.role).toBe('Werewolf');
    expect(payload.werewolfUserIds).toEqual(['wolf', 'alpha']);
    expect(payload.nightKillTargetUserId).toBe('villager');
  });

  it('exposes doctor-specific state only to the doctor', () => {
    const lobby = createLobby({
      roles: {
        doctor: 'Doctor',
        villager: 'Villager',
      },
      roleState: {
        doctor: { doctorSelfProtectUsed: true },
      },
      pendingDoctorProtectTargets: [['doctor', 'villager']],
    });

    const doctorPayload = buildGameInitPayloadForUser({ lobby, userId: 'doctor' });
    const villagerPayload = buildGameInitPayloadForUser({ lobby, userId: 'villager' });

    expect(doctorPayload.doctorProtectTargetUserId).toBe('villager');
    expect(doctorPayload.doctorSelfProtectUsed).toBe(true);
    expect(villagerPayload.doctorProtectTargetUserId).toBe(null);
    expect(villagerPayload.doctorSelfProtectUsed).toBe(null);
  });

  it('exposes executioner target info only to the executioner', () => {
    const lobby = createLobby({
      roles: {
        executioner: 'Executioner',
        target: 'Villager',
      },
      roleState: {
        executioner: { executionerTargetUserId: 'target' },
      },
    });

    const payload = buildGameInitPayloadForUser({
      lobby,
      userId: 'executioner',
    });

    expect(payload.executionerTargetUserId).toBe('target');
    expect(payload.executionerTargetName).toBe('target-name');
  });

  it('marks dead players as unable to write in their notebook', () => {
    const lobby = createLobby({
      roles: {
        mimic: 'Mimic',
      },
      eliminatedUserIds: ['mimic'],
      pendingMimicTargets: [['mimic', 'mimic']],
    });

    const payload = buildGameInitPayloadForUser({ lobby, userId: 'mimic' });

    expect(payload.canWriteNotebook).toBe(false);
    expect(payload.mimicTargetUserId).toBe('mimic');
  });
});
