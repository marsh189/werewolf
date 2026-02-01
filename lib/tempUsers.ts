export type TempUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // for demo only; use hashing in real apps
};

export const tempUsers: TempUser[] = [];
