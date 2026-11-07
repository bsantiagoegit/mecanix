export type Role = 'owner' | 'advisor' | 'mechanic';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
}

export interface AuthSession {
  user: User;
  role: Role;
  activeWorkshopId: string;
}
