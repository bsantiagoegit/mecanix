export type Role = 'owner' | 'advisor' | 'mechanic';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
}

/** Invitación a un taller que el usuario aún no aceptó (UC-WS-04). */
export interface PendingInvitation {
  workshopName: string;
  role: Role;
}

/**
 * Sesión de la aplicación. Un usuario autenticado que aún no pertenece a ningún taller
 * (recién registrado) tiene `role` y `activeWorkshopId` en `null` y debe crear el suyo
 * (UC-WS-08, ADR-012), salvo que tenga una invitación pendiente: entonces la acepta primero
 * (UC-WS-04, ADR-013). Solo hay `invitation` cuando no hay taller.
 */
export interface AuthSession {
  user: User;
  role: Role | null;
  activeWorkshopId: string | null;
  invitation: PendingInvitation | null;
}
