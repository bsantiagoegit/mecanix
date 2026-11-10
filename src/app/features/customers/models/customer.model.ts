/** Cuántos clientes se piden por página en la lista (UC-CUST-02). */
export const CUSTOMER_PAGE_SIZE = 20;

/**
 * Cliente tal como lo devuelve la búsqueda. Para el `mechanic` el teléfono, el email y la
 * identificación llegan en `null`: la base de datos solo le entrega el nombre (D-RLS-12).
 */
export interface CustomerSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  identification: string | null;
}

/** Una página de resultados; `hasMore` indica si quedan más por cargar. */
export interface CustomerPage {
  items: CustomerSummary[];
  hasMore: boolean;
}

/** Cliente completo (solo lo ven `owner` y `advisor`: incluye datos de contacto y dirección). */
export interface Customer extends CustomerSummary {
  address: string | null;
}

/** Lo que el formulario envía al registrar o editar. Los opcionales vacíos van como `null`. */
export interface CustomerInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  identification: string | null;
  address: string | null;
}

/** Un cliente existente que choca con lo que se está escribiendo (teléfono o identificación). */
export interface CustomerMatch {
  id: string;
  fullName: string;
  phone: string;
}

/** Texto de un campo del formulario: sin espacios en los extremos; vacío es `null` si es opcional. */
export function normalizeInput(raw: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  identification: string;
  address: string;
}): CustomerInput {
  const optional = (value: string) => (value.trim() === '' ? null : value.trim());
  return {
    firstName: raw.firstName.trim(),
    lastName: raw.lastName.trim(),
    phone: raw.phone.trim(),
    email: optional(raw.email),
    identification: optional(raw.identification)?.toUpperCase() ?? null,
    address: optional(raw.address),
  };
}

/** ¿Es lo mismo? Compara ya normalizado, igual que lo guarda la base de datos. */
export function isSameInput(a: CustomerInput, b: CustomerInput): boolean {
  return (
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    a.phone === b.phone &&
    a.email === b.email &&
    (a.identification ?? null) === (b.identification ?? null) &&
    a.address === b.address
  );
}
