export const ROLES = {
  Villager: {
    faction: 'Village',
    category: 'Basic',
    ability: 'No night action. Use discussion and voting to find enemies.',
    winCondition: 'Village wins when all werewolves are eliminated.',
    revealSummary: 'A steady voice in the dark. Read the room, sway the vote, and expose the pack.',
  },
  Werewolf: {
    faction: 'Enemy',
    category: 'Killing',
    ability: 'Coordinate at night and choose a player to eliminate.',
    winCondition: 'Enemy team wins when werewolves reach parity with Village.',
    revealSummary: 'Hide behind a friendly face by day, then hunt as one beneath the moon.',
  },
  Doctor: {
    faction: 'Village',
    category: 'Support',
    ability: 'Choose a player at night to protect from a kill.',
    winCondition: 'Village wins when all werewolves are eliminated.',
    revealSummary: 'Keep hearts beating through the longest nights. Your protection can change everything.',
  },
  Tracker: {
    faction: 'Village',
    category: 'Information',
    ability: 'Choose a player at night to learn who they visited.',
    winCondition: 'Village wins when all werewolves are eliminated.',
    revealSummary: 'Follow footprints in the dark and uncover who moves when no one should.',
  },
  Lookout: {
    faction: 'Village',
    category: 'Information',
    ability: 'Choose a player at night to see who visited them.',
    winCondition: 'Village wins when all werewolves are eliminated.',
    revealSummary: 'Watch the doors no one else watches. Witnesses decide who survives dawn.',
  },
  Investigator: {
    faction: 'Village',
    category: 'Information',
    ability: 'Investigate one player at night for clues on their role.',
    winCondition: 'Village wins when all werewolves are eliminated.',
    revealSummary: 'Piece together subtle tells and quiet lies to reveal the truth beneath the masks.',
  },
  Hunter: {
    faction: 'Village',
    category: 'Killing',
    ability: 'At night, choose a player to shoot (up to 3 shots total). If you kill a Village role, you die from guilt.',
    winCondition: 'Village wins when all werewolves are eliminated.',
    revealSummary: 'Justice rides with your rifle. Every shot matters, and every mistake has a price.',
  },
  Trapper: {
    faction: 'Village',
    category: 'Control',
    ability: 'At night, you may activate alert (up to 3 uses). Attackers who target you during alert are killed.',
    winCondition: 'Village wins when all werewolves are eliminated.',
    revealSummary: 'Set yourself as bait and spring the trap. Predators who strike carelessly may not return.',
  },
  Escort: {
    faction: 'Village',
    category: 'Control',
    ability: 'Roleblock one player at night so their action fails.',
    winCondition: 'Village wins when all werewolves are eliminated.',
    revealSummary: 'Keep dangerous players occupied and throw enemy plans into disarray.',
  },
  Sentinel: {
    faction: 'Village',
    category: 'Support',
    ability: 'Guard a player and intercept a hostile attack.',
    winCondition: 'Village wins when all werewolves are eliminated.',
    revealSummary: 'Stand between claw and kin. Your watch may be the wall that holds the village together.',
  },
  Jester: {
    faction: 'Neutral',
    category: 'Objective',
    ability: 'Cause chaos and attract suspicion.',
    winCondition: 'Win by being executed by daytime vote.',
    revealSummary: 'Twist the town against you until they hand you victory at the gallows.',
  },
  Executioner: {
    faction: 'Neutral',
    category: 'Objective',
    ability: 'Has a specific target to push for execution. If that target dies at night, you become a Jester.',
    winCondition: 'Win if your assigned target is executed by vote.',
    revealSummary: 'Guide one chosen soul toward the noose; if fate steals them first, embrace chaos as Jester.',
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
