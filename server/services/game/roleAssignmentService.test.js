import { describe, expect, it } from 'vitest';
import { assignRolesToLobby, buildRoleDeck } from './roleAssignmentService.js';

describe('buildRoleDeck', () => {
  it('returns empty deck when memberCount <= 0', () => {
    expect(buildRoleDeck(0, 1, true, true)).toEqual([]);
    expect(buildRoleDeck(-1, 1, true, true)).toEqual([]);
  });

  it('clamps werewolf count to at least 1 and at most memberCount-1', () => {
    const deckTooMany = buildRoleDeck(5, 99, false, false);
    expect(deckTooMany.length).toBe(5);
    expect(deckTooMany.filter((r) => r === 'Werewolf').length).toBe(4);

    const deckTooFew = buildRoleDeck(5, 0, false, false);
    expect(deckTooFew.length).toBe(5);
    expect(deckTooFew.filter((r) => r === 'Werewolf').length).toBe(1);
  });

  it('does not include neutral roles when specialRolesEnabled is false', () => {
    const deck = buildRoleDeck(6, 1, false, true);
    expect(deck.some((r) => r === 'Jester' || r === 'Executioner')).toBe(false);
  });

  it('includes exactly one neutral role when special + neutral enabled and slots exist', () => {
    const deck = buildRoleDeck(8, 2, true, true);
    const neutrals = deck.filter((r) => r === 'Jester' || r === 'Executioner');
    expect(neutrals.length).toBe(1);
  });

  it('deck size always equals memberCount', () => {
    for (const memberCount of [1, 2, 3, 8, 12]) {
      const deck = buildRoleDeck(memberCount, 2, true, true);
      expect(deck.length).toBe(memberCount);
    }
  });
});

describe('assignRolesToLobby', () => {
  it('assigns a role for every member and picks a valid executioner target', () => {
    const originalRandom = Math.random;
    Math.random = () => 0;

    try {
      const lobby = {
        members: new Map(
          Array.from({ length: 8 }, (_, index) => {
            const userId = `u${index + 1}`;
            return [userId, { userId, name: userId }];
          }),
        ),
        werewolfCount: 2,
        specialRolesEnabled: true,
        neutralRolesEnabled: true,
      };

      assignRolesToLobby(lobby);

      expect(lobby.playerRoles).toBeInstanceOf(Map);
      expect(lobby.playerRoles.size).toBe(8);
      expect(lobby.playerRoleState).toBeInstanceOf(Map);
      expect(lobby.playerRoleState.size).toBe(8);

      const executioners = Array.from(lobby.playerRoles.entries()).filter(
        ([, role]) => role === 'Executioner',
      );
      expect(executioners.length).toBe(1);

      const [executionerUserId] = executioners[0];
      const executionerState = lobby.playerRoleState.get(executionerUserId);
      expect(executionerState).toBeTruthy();
      expect(executionerState.executionerTargetUserId).toBeTruthy();

      const targetUserId = executionerState.executionerTargetUserId;
      const targetRole = lobby.playerRoles.get(targetUserId);
      expect(targetRole).toBeTruthy();

      // Must not target enemy or neutral roles.
      expect(
        [
          'Werewolf',
          'AlphaWolf',
          'Framer',
          'Prowler',
          'Cursed',
          'Snatcher',
          'Mimic',
          'Executioner',
          'Jester',
        ].includes(targetRole),
      ).toBe(false);
    } finally {
      Math.random = originalRandom;
    }
  });
});
