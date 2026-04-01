import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./noticeService.js', () => ({
  emitNightActionNotice: vi.fn(),
}));

import { emitNightActionNotice } from './noticeService.js';
import { emitPendingNightResultNotices } from './resultsNoticeService.js';

const createLobby = ({ roles = {} } = {}) => ({
  members: new Map(
    Object.keys(roles).map((userId) => [
      userId,
      { userId, name: userId.toUpperCase() },
    ]),
  ),
  playerRoles: new Map(Object.entries(roles)),
});

const createContext = ({
  aliveUserIds = [],
  roleblockedUserIds = [],
  blockedByEscortUserIds = [],
  visits = [],
  visitors = [],
  framedUserIds = [],
  disguisedRoles = [],
} = {}) => ({
  aliveAtNightStart: new Set(aliveUserIds),
  isRoleblocked: (userId) => roleblockedUserIds.includes(userId),
  blockedByEscort: new Set(blockedByEscortUserIds),
  visitsByUserId: new Map(visits),
  visitorsByTargetUserId: new Map(
    visitors.map(([targetUserId, visitorIds]) => [targetUserId, new Set(visitorIds)]),
  ),
  framedUserIds: new Set(framedUserIds),
  disguisedRoleByUserId: new Map(disguisedRoles),
});

const createPending = ({
  trackerResults = [],
  lookoutResults = [],
  investigatorResults = [],
} = {}) => ({
  pendingTrackerResults: trackerResults,
  pendingLookoutResults: lookoutResults,
  pendingInvestigatorResults: investigatorResults,
  pendingProwlerResults: [],
  pendingFramerResults: [],
  pendingSnatcherResults: [],
  pendingCursedResults: [],
  pendingMimicResults: [],
});

beforeEach(() => {
  vi.mocked(emitNightActionNotice).mockClear();
});

describe('emitPendingNightResultNotices', () => {
  it('tells a tracker who their target visited', () => {
    const lobby = createLobby({
      roles: {
        tracker: 'Tracker',
        target: 'Doctor',
        visited: 'Villager',
      },
    });
    const context = createContext({
      aliveUserIds: ['tracker', 'target', 'visited'],
      visits: [['target', 'visited']],
    });
    const pending = createPending({
      trackerResults: [['tracker', 'target']],
    });

    emitPendingNightResultNotices({}, lobby, context, pending);

    expect(emitNightActionNotice).toHaveBeenCalledWith(
      {},
      lobby,
      ['tracker'],
      'TARGET visited VISITED.',
    );
  });

  it('tells a lookout which players visited their watched target', () => {
    const lobby = createLobby({
      roles: {
        lookout: 'Lookout',
        watched: 'Villager',
        wolf: 'Werewolf',
        doctor: 'Doctor',
      },
    });
    const context = createContext({
      aliveUserIds: ['lookout', 'watched', 'wolf', 'doctor'],
      visitors: [['watched', ['lookout', 'wolf', 'doctor']]],
    });
    const pending = createPending({
      lookoutResults: [['lookout', 'watched']],
    });

    emitPendingNightResultNotices({}, lobby, context, pending);

    expect(emitNightActionNotice).toHaveBeenCalledWith(
      {},
      lobby,
      ['lookout'],
      'WOLF and DOCTOR visited WATCHED.',
    );
  });

  it('tells an investigator framed targets could be werewolf-group roles', () => {
    const lobby = createLobby({
      roles: {
        investigator: 'Investigator',
        target: 'Villager',
      },
    });
    const context = createContext({
      aliveUserIds: ['investigator', 'target'],
      framedUserIds: ['target'],
    });
    const pending = createPending({
      investigatorResults: [['investigator', 'target']],
    });

    emitPendingNightResultNotices({}, lobby, context, pending);

    expect(emitNightActionNotice).toHaveBeenCalledWith(
      {},
      lobby,
      ['investigator'],
      'TARGET could be a Hunter, an Executioner, or a Werewolf.',
    );
  });

  it('uses a mimicked role for investigator results', () => {
    const lobby = createLobby({
      roles: {
        investigator: 'Investigator',
        mimic: 'Mimic',
        source: 'Doctor',
      },
    });
    const context = createContext({
      aliveUserIds: ['investigator', 'mimic', 'source'],
      disguisedRoles: [['mimic', 'Doctor']],
    });
    const pending = createPending({
      investigatorResults: [['investigator', 'mimic']],
    });

    emitPendingNightResultNotices({}, lobby, context, pending);

    expect(emitNightActionNotice).toHaveBeenCalledWith(
      {},
      lobby,
      ['investigator'],
      'MIMIC could be a Villager, a Doctor, or a Bodyguard.',
    );
  });

  it('tells roleblocked information roles they learned nothing', () => {
    const lobby = createLobby({
      roles: {
        tracker: 'Tracker',
        lookout: 'Lookout',
        investigator: 'Investigator',
        target: 'Villager',
      },
    });
    const context = createContext({
      aliveUserIds: ['tracker', 'lookout', 'investigator', 'target'],
      roleblockedUserIds: ['tracker', 'lookout', 'investigator'],
    });
    const pending = createPending({
      trackerResults: [['tracker', 'target']],
      lookoutResults: [['lookout', 'target']],
      investigatorResults: [['investigator', 'target']],
    });

    emitPendingNightResultNotices({}, lobby, context, pending);

    expect(emitNightActionNotice).toHaveBeenNthCalledWith(
      1,
      {},
      lobby,
      ['tracker'],
      'You were roleblocked and learned nothing.',
    );
    expect(emitNightActionNotice).toHaveBeenNthCalledWith(
      2,
      {},
      lobby,
      ['lookout'],
      'You were roleblocked and learned nothing.',
    );
    expect(emitNightActionNotice).toHaveBeenNthCalledWith(
      3,
      {},
      lobby,
      ['investigator'],
      'You were roleblocked and learned nothing.',
    );
  });
});
