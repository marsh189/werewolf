/* =============================================================================
   Role Predicates (Server)

   Central place for role-category checks so game logic, chat rules, and payload
   shaping don't drift over time.
============================================================================= */

export const WEREWOLF_ROLES = [
  'Werewolf',
  'AlphaWolf',
  'Framer',
  'Prowler',
  'Cursed',
  'Snatcher',
  'Mimic',
];

export const NEUTRAL_ROLES = ['Jester', 'Executioner'];

const WEREWOLF_ROLE_SET = new Set(WEREWOLF_ROLES);
const NEUTRAL_ROLE_SET = new Set(NEUTRAL_ROLES);

export const isWerewolfRole = (role) => WEREWOLF_ROLE_SET.has(role);

export const isVillageRole = (role) => !!role && !isWerewolfRole(role) && !NEUTRAL_ROLE_SET.has(role);

export const getFactionForRole = (role) => {
  if (!role) return null;
  if (isWerewolfRole(role)) return 'Enemy';
  if (NEUTRAL_ROLE_SET.has(role)) return 'Neutral';
  return 'Village';
};

export const hasNightAction = (role) =>
  role === 'Doctor' ||
  role === 'Werewolf' ||
  role === 'AlphaWolf' ||
  role === 'Hunter' ||
  role === 'Trapper' ||
  role === 'Escort' ||
  role === 'Bodyguard' ||
  role === 'Tracker' ||
  role === 'Lookout' ||
  role === 'Investigator' ||
  role === 'Framer' ||
  role === 'Prowler' ||
  role === 'Cursed' ||
  role === 'Snatcher' ||
  role === 'Mimic';

