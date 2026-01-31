export const ROLES = [
  'Villager',
  'Werewolf',
  'Doctor',
  'Detective',
  'Sherrif',
] as const;

export type Role = (typeof ROLES)[number];
