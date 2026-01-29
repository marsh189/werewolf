export type Role = 'villager' | 'werewolf';

export type Player = {
  id: string;
  name: string;
  role: Role;
  alive: boolean;
  vote?: string;
};
