import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./noticeService.js', () => ({
  emitNightActionNotice: vi.fn(),
}));

import { emitNightActionNotice } from './noticeService.js';
import { emitImmediateNightFeedback } from './resultsNoticeService.js';

const createLobby = ({
  roles = {},
  doctorTargets = [],
  bodyguardTargets = [],
} = {}) => ({
  members: new Map(
    Object.keys(roles).map((userId) => [
      userId,
      { userId, name: userId.toUpperCase() },
    ]),
  ),
  playerRoles: new Map(Object.entries(roles)),
  pendingDoctorProtectTargets: new Map(doctorTargets),
  pendingBodyguardGuardTargets: new Map(bodyguardTargets),
});

beforeEach(() => {
  vi.mocked(emitNightActionNotice).mockClear();
});

describe('emitImmediateNightFeedback', () => {
  it('tells werewolves when their target survives the night', () => {
    const lobby = createLobby({
      roles: {
        wolf: 'Werewolf',
        alpha: 'AlphaWolf',
        target: 'Villager',
      },
    });

    emitImmediateNightFeedback({}, lobby, {
      aliveAtNightStart: new Set(['wolf', 'alpha', 'target']),
      aliveWerewolfIds: ['wolf', 'alpha'],
      alphaWolfTargetId: null,
      werewolfTargetId: 'target',
      attackedTargetIds: new Set(['target']),
      trapperVisitedUserIds: new Set(),
      blockedByEscort: new Set(),
      blockedBySnatcher: new Set(),
      deaths: new Set(),
    });

    expect(emitNightActionNotice).toHaveBeenCalledWith(
      {},
      lobby,
      ['wolf', 'alpha'],
      'TARGET survived the night.',
      'werewolf',
    );
  });

  it('tells a doctor when their protected target was attacked', () => {
    const lobby = createLobby({
      roles: {
        doctor: 'Doctor',
        target: 'Villager',
      },
      doctorTargets: [['doctor', 'target']],
    });

    emitImmediateNightFeedback({}, lobby, {
      aliveAtNightStart: new Set(['doctor', 'target']),
      aliveWerewolfIds: [],
      alphaWolfTargetId: null,
      werewolfTargetId: null,
      attackedTargetIds: new Set(['target']),
      trapperVisitedUserIds: new Set(),
      blockedByEscort: new Set(),
      blockedBySnatcher: new Set(),
      deaths: new Set(),
    });

    expect(emitNightActionNotice).toHaveBeenCalledWith(
      {},
      lobby,
      ['doctor'],
      'TARGET was attacked during the night.',
    );
  });

  it('tells a bodyguard when their guarded target was attacked', () => {
    const lobby = createLobby({
      roles: {
        bodyguard: 'Bodyguard',
        target: 'Villager',
      },
      bodyguardTargets: [['bodyguard', 'target']],
    });

    emitImmediateNightFeedback({}, lobby, {
      aliveAtNightStart: new Set(['bodyguard', 'target']),
      aliveWerewolfIds: [],
      alphaWolfTargetId: null,
      werewolfTargetId: null,
      attackedTargetIds: new Set(['target']),
      trapperVisitedUserIds: new Set(),
      blockedByEscort: new Set(),
      blockedBySnatcher: new Set(),
      deaths: new Set(),
    });

    expect(emitNightActionNotice).toHaveBeenCalledWith(
      {},
      lobby,
      ['bodyguard'],
      'TARGET was attacked during the night.',
    );
  });

  it('tells a trapper when someone visited them', () => {
    const lobby = createLobby({
      roles: {
        trapper: 'Trapper',
      },
    });

    emitImmediateNightFeedback({}, lobby, {
      aliveAtNightStart: new Set(['trapper']),
      aliveWerewolfIds: [],
      alphaWolfTargetId: null,
      werewolfTargetId: null,
      attackedTargetIds: new Set(),
      trapperVisitedUserIds: new Set(['trapper']),
      blockedByEscort: new Set(),
      blockedBySnatcher: new Set(),
      deaths: new Set(),
    });

    expect(emitNightActionNotice).toHaveBeenCalledWith(
      {},
      lobby,
      ['trapper'],
      'Someone visited you during the night.',
    );
  });
});
