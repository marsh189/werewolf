export const ROLES = {
  Villager: {
    faction: 'Village',
    category: 'Basic',
    ability: 'No night action. Use discussion and voting to find enemies.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Werewolf: {
    faction: 'Enemy',
    category: 'Killing',
    ability: 'Coordinate at night and choose a player to eliminate.',
    winCondition: 'Enemy team wins when werewolves reach parity with Village.',
  },
  Doctor: {
    faction: 'Village',
    category: 'Support',
    ability: 'Choose a player at night to protect from a kill.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Tracker: {
    faction: 'Village',
    category: 'Information',
    ability: 'Choose a player at night to learn who they visited.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Lookout: {
    faction: 'Village',
    category: 'Information',
    ability: 'Choose a player at night to see who visited them.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Investigator: {
    faction: 'Village',
    category: 'Information',
    ability: 'Investigate one player at night for clues on their role.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Hunter: {
    faction: 'Village',
    category: 'Killing',
    ability: 'At night, choose a player to shoot (up to 3 shots total). If you kill a Village role, you die from guilt.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Trapper: {
    faction: 'Village',
    category: 'Control',
    ability: 'At night, you may activate alert (up to 3 uses). Attackers who target you during alert are killed.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Escort: {
    faction: 'Village',
    category: 'Control',
    ability: 'Roleblock one player at night so their action fails.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Sentinel: {
    faction: 'Village',
    category: 'Support',
    ability: 'Guard a player and intercept a hostile attack.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Jester: {
    faction: 'Neutral',
    category: 'Objective',
    ability: 'Cause chaos and attract suspicion.',
    winCondition: 'Win by being executed by daytime vote.',
  },
  Executioner: {
    faction: 'Neutral',
    category: 'Objective',
    ability: 'Has a specific target to push for execution.',
    winCondition: 'Win if your assigned target is executed by vote.',
  },
} as const;

export type Role = keyof typeof ROLES;
export type RoleFaction = (typeof ROLES)[Role]['faction'];
export type RoleCategory = (typeof ROLES)[Role]['category'];

export const ROLE_NAMES = Object.keys(ROLES) as Role[];

export const VILLAGE_ROLE_NAMES = ROLE_NAMES.filter(
  (role) => ROLES[role].faction === 'Village',
) as Role[];

export const VILLAGE_ROLES_BY_CATEGORY = {
  Basic: VILLAGE_ROLE_NAMES.filter((role) => ROLES[role].category === 'Basic'),
  Killing: VILLAGE_ROLE_NAMES.filter(
    (role) => ROLES[role].category === 'Killing',
  ),
  Support: VILLAGE_ROLE_NAMES.filter(
    (role) => ROLES[role].category === 'Support',
  ),
  Information: VILLAGE_ROLE_NAMES.filter(
    (role) => ROLES[role].category === 'Information',
  ),
  Control: VILLAGE_ROLE_NAMES.filter(
    (role) => ROLES[role].category === 'Control',
  ),
} as const;
