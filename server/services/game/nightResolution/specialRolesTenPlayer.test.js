import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./noticeService.js', () => ({
  emitNightActionNotice: vi.fn(),
}));

import { emitNightActionNotice } from './noticeService.js';
import { resolveNightAndStartResults } from './nightResolutionService.js';

const createIo = () => ({
  emit: vi.fn(),
  to: vi.fn(() => ({
    emit: vi.fn(),
  })),
});

const createTenPlayerLobby = ({
  roles,
  roleState = {},
  alphaWolfTargetId = null,
  werewolfActorUserId = null,
  werewolfTargetId = null,
  hunterTargets = [],
  doctorTargets = [],
  trapperAlertUserIds = [],
  escortTargets = [],
  bodyguardTargets = [],
  trackerTargets = [],
  lookoutTargets = [],
  investigatorTargets = [],
  framerTargets = [],
  prowlerTargets = [],
  snatcherTargets = [],
  cursedTargets = [],
  mimicTargets = [],
} = {}) => ({
  name: 'ten-player-specials',
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
  pendingAlphaWolfKillTargetId: alphaWolfTargetId,
  pendingHunterKillTargets: new Map(hunterTargets),
  pendingTrapperAlertUserIds: new Set(trapperAlertUserIds),
  pendingEscortVisitTargets: new Map(escortTargets),
  pendingBodyguardGuardTargets: new Map(bodyguardTargets),
  pendingDoctorProtectTargets: new Map(doctorTargets),
  pendingTrackerWatchTargets: new Map(trackerTargets),
  pendingLookoutWatchTargets: new Map(lookoutTargets),
  pendingInvestigatorVisitTargets: new Map(investigatorTargets),
  pendingFramerTargets: new Map(framerTargets),
  pendingProwlerTargets: new Map(prowlerTargets),
  pendingSnatcherTargets: new Map(snatcherTargets),
  pendingCursedTargets: new Map(cursedTargets),
  pendingMimicTargets: new Map(mimicTargets),
});

const expectNotice = ({
  recipientUserIds,
  content,
  audience,
}) => {
  const calls = vi.mocked(emitNightActionNotice).mock.calls;
  const matched = calls.some((call) => {
    const [, , recipients, callContent, callAudience] = call;
    return (
      JSON.stringify(recipients) === JSON.stringify(recipientUserIds) &&
      callContent === content &&
      (audience === undefined || callAudience === audience)
    );
  });

  expect(matched).toBe(true);
};

beforeEach(() => {
  vi.mocked(emitNightActionNotice).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('10-player special-role matrix', () => {
  it('covers alpha wolf, doctor, tracker, lookout, and investigator in one 10-player lobby', () => {
    const io = createIo();
    const lobby = createTenPlayerLobby({
      roles: {
        alpha: 'AlphaWolf',
        doctor: 'Doctor',
        tracker: 'Tracker',
        lookout: 'Lookout',
        investigator: 'Investigator',
        villager: 'Villager',
        filler1: 'Villager',
        filler2: 'Villager',
        filler3: 'Villager',
        filler4: 'Villager',
      },
      alphaWolfTargetId: 'villager',
      doctorTargets: [['doctor', 'villager']],
      trackerTargets: [['tracker', 'alpha']],
      lookoutTargets: [['lookout', 'villager']],
      investigatorTargets: [['investigator', 'alpha']],
    });

    resolveNightAndStartResults(io, lobby, vi.fn());

    expect(lobby.eliminatedUserIds.size).toBe(0);
    expectNotice({
      recipientUserIds: ['alpha'],
      content: 'VILLAGER survived the night.',
      audience: 'werewolf',
    });
    expectNotice({
      recipientUserIds: ['doctor'],
      content: 'VILLAGER was attacked during the night.',
    });
    expectNotice({
      recipientUserIds: ['tracker'],
      content: 'ALPHA visited VILLAGER.',
    });
    expectNotice({
      recipientUserIds: ['lookout'],
      content: 'ALPHA and DOCTOR visited VILLAGER.',
    });
    expectNotice({
      recipientUserIds: ['investigator'],
      content: 'ALPHA could be a Hunter, an Executioner, or a Werewolf.',
    });
  });

  it('covers escort, snatcher, cursed, mimic, framer, and prowler in one 10-player lobby', () => {
    const io = createIo();
    const lobby = createTenPlayerLobby({
      roles: {
        alpha: 'AlphaWolf',
        escort: 'Escort',
        snatcher: 'Snatcher',
        doctor: 'Doctor',
        cursed: 'Cursed',
        mimic: 'Mimic',
        framer: 'Framer',
        prowler: 'Prowler',
        investigator: 'Investigator',
        villager: 'Villager',
      },
      alphaWolfTargetId: 'villager',
      escortTargets: [['escort', 'snatcher']],
      snatcherTargets: [['snatcher', 'doctor']],
      doctorTargets: [['doctor', 'villager']],
      cursedTargets: [['cursed', 'villager']],
      mimicTargets: [['mimic', 'doctor']],
      framerTargets: [['framer', 'villager']],
      prowlerTargets: [['prowler', 'doctor']],
      investigatorTargets: [['investigator', 'villager']],
    });

    resolveNightAndStartResults(io, lobby, vi.fn());

    expect(lobby.eliminatedUserIds.has('villager')).toBe(true);
    expectNotice({
      recipientUserIds: ['snatcher'],
      content: 'You were roleblocked and snatched no one.',
    });
    expectNotice({
      recipientUserIds: ['cursed'],
      content: 'You cursed VILLAGER.',
    });
    expectNotice({
      recipientUserIds: ['mimic'],
      content: "You mimicked DOCTOR's role.",
    });
    expectNotice({
      recipientUserIds: ['framer'],
      content: 'You framed VILLAGER.',
    });
    expectNotice({
      recipientUserIds: ['prowler'],
      content: 'DOCTOR could be a Villager, a Doctor, or a Bodyguard.',
    });
    expectNotice({
      recipientUserIds: ['investigator'],
      content: 'VILLAGER could be a Hunter, an Executioner, or a Werewolf.',
    });
  });

  it('covers bodyguard interception in a 10-player lobby', () => {
    const io = createIo();
    const lobby = createTenPlayerLobby({
      roles: {
        alpha: 'AlphaWolf',
        bodyguard: 'Bodyguard',
        protected: 'Villager',
        filler1: 'Villager',
        filler2: 'Villager',
        filler3: 'Villager',
        filler4: 'Villager',
        filler5: 'Villager',
        filler6: 'Villager',
        filler7: 'Villager',
      },
      alphaWolfTargetId: 'protected',
      bodyguardTargets: [['bodyguard', 'protected']],
    });

    resolveNightAndStartResults(io, lobby, vi.fn());

    expect(lobby.eliminatedUserIds.has('bodyguard')).toBe(true);
    expect(lobby.eliminatedUserIds.has('protected')).toBe(false);
    expectNotice({
      recipientUserIds: ['bodyguard'],
      content: 'PROTECTED was attacked during the night.',
    });
  });

  it('covers hunter guilt and trapper retaliation in a 10-player lobby', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const io = createIo();
    const lobby = createTenPlayerLobby({
      roles: {
        alpha: 'AlphaWolf',
        werewolf: 'Werewolf',
        hunter: 'Hunter',
        trapper: 'Trapper',
        target: 'Villager',
        filler1: 'Villager',
        filler2: 'Villager',
        filler3: 'Villager',
        filler4: 'Villager',
        filler5: 'Villager',
      },
      roleState: {
        hunter: { hunterShotsRemaining: 3 },
        trapper: { trapperAlertsRemaining: 3 },
      },
      werewolfActorUserId: 'werewolf',
      werewolfTargetId: 'trapper',
      hunterTargets: [['hunter', 'target']],
      trapperAlertUserIds: ['trapper'],
    });

    resolveNightAndStartResults(io, lobby, vi.fn());

    expect(lobby.eliminatedUserIds.has('hunter')).toBe(true);
    expect(lobby.eliminatedUserIds.has('target')).toBe(true);
    expect(lobby.eliminatedUserIds.has('alpha')).toBe(true);
    expect(lobby.eliminatedUserIds.has('trapper')).toBe(false);
    expect(lobby.playerRoleState.get('hunter')?.hunterShotsRemaining).toBe(2);
    expectNotice({
      recipientUserIds: ['trapper'],
      content: 'Someone visited you during the night.',
    });
  });
});
