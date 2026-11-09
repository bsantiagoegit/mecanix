export type Role = 'owner' | 'advisor' | 'mechanic';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
}

/**
 * Sesión de la aplicación. Un usuario autenticado que aún no pertenece a ningún taller
 * (recién registrado) tiene `role` y `activeWorkshopId` en `null` y debe crear el suyo
 * (UC-WS-08, ADR-012).
 */
export interface AuthSession {
  user: User;
  role: Role | null;
  activeWorkshopId: string | null;
}
