export type RoleDescription = {
  ability: string;
  winCondition: string;
};

export const ROLES = {
  Villager: {
    faction: 'Village',
    ability: 'No night action. Use discussion and voting to find enemies.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Werewolf: {
    faction: 'Enemy',
    ability: 'Coordinate at night and choose a player to eliminate.',
    winCondition: 'Enemy team wins when werewolves reach parity with Village.',
  },
  Doctor: {
    faction: 'Village',
    ability: 'Choose a player at night to protect from a kill.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Tracker: {
    faction: 'Village',
    ability: 'Choose a player at night to learn who they visited.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Lookout: {
    faction: 'Village',
    ability: 'Choose a player at night to see who visited them.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Investigator: {
    faction: 'Village',
    ability: 'Investigate one player at night for alignment clues.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Hunter: {
    faction: 'Village',
    ability: 'Limited offensive power; can eliminate a target at night.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Trapper: {
    faction: 'Village',
    ability: 'Set a trap that can punish or reveal hostile visitors.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Escort: {
    faction: 'Village',
    ability: 'Roleblock one player at night so their action fails.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Sentinel: {
    faction: 'Village',
    ability: 'Guard a player and intercept a hostile attack.',
    winCondition: 'Village wins when all werewolves are eliminated.',
  },
  Jester: {
    faction: 'Neutral',
    ability: 'Cause chaos and attract suspicion.',
    winCondition: 'Win by being executed by daytime vote.',
  },
  Executioner: {
    faction: 'Neutral',
    ability: 'Has a specific target to push for execution.',
    winCondition: 'Win if your assigned target is executed by vote.',
  },
} as const;

export type Role = keyof typeof ROLES;
export type RoleFaction = (typeof ROLES)[Role]['faction'];
