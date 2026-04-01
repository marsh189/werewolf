import { describe, expect, it } from 'vitest';
import { buildNightInteractionContext } from './interactionService.js';

const createLobby = ({
  roles = {},
  roleState = {},
  doctorTargets = [],
  escortTargets = [],
  snatcherTargets = [],
  cursedTargets = [],
} = {}) => ({
  members: new Map(
    Object.keys(roles).map((userId) => [userId, { userId, name: userId }]),
  ),
  playerRoles: new Map(Object.entries(roles)),
  playerRoleState: new Map(Object.entries(roleState)),
  pendingDoctorProtectTargets: new Map(doctorTargets),
  pendingEscortVisitTargets: new Map(escortTargets),
  pendingSnatcherTargets: new Map(snatcherTargets),
  pendingCursedTargets: new Map(cursedTargets),
  pendingTrapperAlertUserIds: new Set(),
  pendingFramerTargets: new Map(),
  pendingMimicTargets: new Map(),
});

describe('buildNightInteractionContext', () => {
  it('allows doctor self-protect once per game', () => {
    const lobby = createLobby({
      roles: { doctor: 'Doctor' },
      roleState: { doctor: { doctorSelfProtectUsed: false } },
      doctorTargets: [['doctor', 'doctor']],
    });
    const aliveAtNightStart = new Set(['doctor']);

    const firstNight = buildNightInteractionContext(lobby, aliveAtNightStart);
    expect(firstNight.doctorProtectedUserIds.has('doctor')).toBe(true);
    expect(lobby.playerRoleState.get('doctor')?.doctorSelfProtectUsed).toBe(true);

    const secondNight = buildNightInteractionContext(lobby, aliveAtNightStart);
    expect(secondNight.doctorProtectedUserIds.has('doctor')).toBe(false);
  });

  it('lets cursed remove doctor protection from the same target', () => {
    const lobby = createLobby({
      roles: {
        doctor: 'Doctor',
        cursed: 'Cursed',
        target: 'Villager',
      },
      roleState: { doctor: { doctorSelfProtectUsed: false } },
      doctorTargets: [['doctor', 'target']],
      cursedTargets: [['cursed', 'target']],
    });

    const context = buildNightInteractionContext(
      lobby,
      new Set(['doctor', 'cursed', 'target']),
    );

    expect(context.doctorProtectedUserIds.has('target')).toBe(false);
    expect(context.cursedUserIds.has('target')).toBe(true);
  });

  it('prevents a snatcher from roleblocking when escorted', () => {
    const lobby = createLobby({
      roles: {
        escort: 'Escort',
        snatcher: 'Snatcher',
        doctor: 'Doctor',
      },
      escortTargets: [['escort', 'snatcher']],
      snatcherTargets: [['snatcher', 'doctor']],
    });

    const context = buildNightInteractionContext(
      lobby,
      new Set(['escort', 'snatcher', 'doctor']),
    );

    expect(context.blockedByEscort.has('snatcher')).toBe(true);
    expect(context.blockedBySnatcher.has('doctor')).toBe(false);
  });
});
