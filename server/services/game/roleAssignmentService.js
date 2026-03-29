/* =============================================================================
   Role Assignment Service

   Builds a role "deck" based on lobby settings and assigns roles to members.
   Extracted from `lobbyService.js` to keep the main game-loop file readable.
============================================================================= */

const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const VILLAGE_SPECIAL_ROLES = [
  'Doctor',
  'Tracker',
  'Lookout',
  'Investigator',
  'Hunter',
  'Trapper',
  'Escort',
  'Bodyguard',
];

const WEREWOLF_SPECIAL_ROLES = [
  'AlphaWolf',
  'Framer',
  'Prowler',
  'Cursed',
  'Snatcher',
  'Mimic',
];

const NEUTRAL_SPECIAL_ROLES = [
  'Jester',
  'Executioner',
];

const VILLAGE_ROLE_CATEGORY_BY_ROLE = {
  Doctor: 'Support',
  Tracker: 'Information',
  Lookout: 'Information',
  Investigator: 'Information',
  Hunter: 'Killing',
  Trapper: 'Control',
  Escort: 'Control',
  Bodyguard: 'Support',
};

const pickRandomItems = (items, count) => shuffle(items).slice(0, count);

const getVillageCategoryTargets = (slots) => {
  const targets = {
    Killing: 0,
    Information: 0,
    Support: 0,
    Control: 0,
  };

  if (slots <= 0) return targets;
  if (slots === 1) {
    targets.Information = 1;
    return targets;
  }
  if (slots === 2) {
    targets.Information = 1;
    targets.Support = 1;
    return targets;
  }
  if (slots === 3) {
    targets.Information = 1;
    targets.Support = 1;
    targets.Control = 1;
    return targets;
  }
  if (slots === 4) {
    targets.Killing = 1;
    targets.Information = 1;
    targets.Support = 1;
    targets.Control = 1;
    return targets;
  }

  targets.Killing = 1;
  targets.Information = 2;
  targets.Support = 1;
  targets.Control = 1;

  let remaining = slots - 5;
  const growthOrder = ['Support', 'Control', 'Information'];
  let index = 0;
  while (remaining > 0) {
    const category = growthOrder[index % growthOrder.length];
    targets[category] += 1;
    remaining -= 1;
    index += 1;
  }

  return targets;
};

const selectVillageSpecialRoles = (slots) => {
  if (slots <= 0) return [];

  const byCategory = {
    Killing: [],
    Information: [],
    Support: [],
    Control: [],
  };

  for (const role of VILLAGE_SPECIAL_ROLES) {
    const category = VILLAGE_ROLE_CATEGORY_BY_ROLE[role];
    if (category && byCategory[category]) {
      byCategory[category].push(role);
    }
  }

  const targets = getVillageCategoryTargets(slots);
  const selected = [];

  for (const category of Object.keys(byCategory)) {
    const needed = targets[category] ?? 0;
    if (needed <= 0) continue;
    selected.push(...pickRandomItems(byCategory[category], needed));
  }

  if (selected.length >= slots) {
    return selected.slice(0, slots);
  }

  const remainingPool = VILLAGE_SPECIAL_ROLES.filter(
    (role) => !selected.includes(role),
  );
  selected.push(...pickRandomItems(remainingPool, slots - selected.length));
  return selected;
};

const buildRoleDeck = (
  memberCount,
  werewolfCount,
  specialRolesEnabled,
  neutralRolesEnabled,
) => {
  if (memberCount <= 0) return [];

  const maxWerewolves = memberCount === 1 ? 1 : memberCount - 1;
  const safeWerewolfCount = Math.max(
    1,
    Math.min(maxWerewolves, Number(werewolfCount) || 1),
  );

  const availableSpecialSlots = Math.max(0, memberCount - safeWerewolfCount);
  let selectedNeutralRoles = [];
  if (specialRolesEnabled && neutralRolesEnabled && availableSpecialSlots > 0) {
    selectedNeutralRoles = pickRandomItems(NEUTRAL_SPECIAL_ROLES, 1);
  }
  const villageSpecialSlots = Math.max(
    0,
    availableSpecialSlots - selectedNeutralRoles.length,
  );
  const selectedVillageRoles = specialRolesEnabled
    ? selectVillageSpecialRoles(villageSpecialSlots)
    : [];
  const specialRoles = shuffle([...selectedVillageRoles, ...selectedNeutralRoles]);
  const villagerCount = memberCount - safeWerewolfCount - specialRoles.length;

  const werewolfRoles = specialRolesEnabled
    ? (() => {
        const pickedSpecials = pickRandomItems(
          WEREWOLF_SPECIAL_ROLES.filter((role) => role !== 'AlphaWolf'),
          Math.max(0, safeWerewolfCount - 1),
        );
        const roles = ['AlphaWolf', ...pickedSpecials];
        while (roles.length < safeWerewolfCount) {
          roles.push('Werewolf');
        }
        return roles.slice(0, safeWerewolfCount);
      })()
    : Array.from({ length: safeWerewolfCount }, () => 'Werewolf');

  return [
    ...werewolfRoles,
    ...specialRoles,
    ...Array.from({ length: villagerCount }, () => 'Villager'),
  ];
};

const createInitialRoleState = (role) => ({
  hunterShotsRemaining: role === 'Hunter' ? 3 : 0,
  trapperAlertsRemaining: role === 'Trapper' ? 3 : 0,
  doctorSelfProtectUsed: false,
  executionerTargetUserId: null,
});

export const assignRolesToLobby = (lobby) => {
  const members = Array.from(lobby.members.values());
  const deck = shuffle(
    buildRoleDeck(
      members.length,
      lobby.werewolfCount,
      lobby.specialRolesEnabled === true,
      lobby.neutralRolesEnabled === true,
    ),
  );
  const shuffledMembers = shuffle(members);
  const nextRoles = new Map();

  for (let i = 0; i < shuffledMembers.length; i++) {
    nextRoles.set(shuffledMembers[i].userId, deck[i] ?? 'Villager');
  }

  lobby.playerRoles = nextRoles;
  const initialRoleState = new Map(
    Array.from(nextRoles.entries()).map(([userId, role]) => [
      userId,
      createInitialRoleState(role),
    ]),
  );

  // Executioner gets a random non-werewolf target (if possible).
  const executionerIds = Array.from(nextRoles.entries())
    .filter(([, role]) => role === 'Executioner')
    .map(([userId]) => userId);
  for (const executionerUserId of executionerIds) {
    const candidateTargetIds = Array.from(nextRoles.entries())
      .filter(
        ([targetUserId, targetRole]) =>
          targetUserId !== executionerUserId &&
          targetRole !== 'Werewolf' &&
          targetRole !== 'AlphaWolf' &&
          targetRole !== 'Framer' &&
          targetRole !== 'Prowler' &&
          targetRole !== 'Cursed' &&
          targetRole !== 'Snatcher' &&
          targetRole !== 'Mimic' &&
          targetRole !== 'Executioner' &&
          targetRole !== 'Jester',
      )
      .map(([targetUserId]) => targetUserId);
    const selectedTargetUserId = candidateTargetIds.length
      ? shuffle(candidateTargetIds)[0]
      : null;
    const roleState = initialRoleState.get(executionerUserId) ?? {
      hunterShotsRemaining: 0,
      trapperAlertsRemaining: 0,
      executionerTargetUserId: null,
    };
    roleState.executionerTargetUserId = selectedTargetUserId;
    initialRoleState.set(executionerUserId, roleState);
  }

  lobby.playerRoleState = initialRoleState;
};
