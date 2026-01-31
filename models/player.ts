import { Role } from './roles';

export type Player = {
  id: string;
  name: string;
  role: Role;
  alive: boolean;
  vote?: string;
};
