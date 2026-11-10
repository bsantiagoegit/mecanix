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

/** Lo que el formulario envía al registrar o editar: todos los campos son obligatorios. */
export interface CustomerInput {
  firstName: string;
  lastName: string;
  /** Celular ecuatoriano de 10 dígitos (`09XXXXXXXX`). */
  phone: string;
  email: string;
  /** Cédula ecuatoriana de 10 dígitos, validada con el Módulo 10. */
  identification: string;
  address: string;
}

/** Los datos de un cliente como los pide el formulario. Faltantes (clientes antiguos) quedan vacíos. */
export function customerToInput(customer: Customer): CustomerInput {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    identification: customer.identification ?? '',
    address: customer.address ?? '',
  };
}

/** Un cliente existente que choca con lo que se está escribiendo (teléfono o identificación). */
export interface CustomerMatch {
  id: string;
  fullName: string;
  phone: string;
}

/** Los textos del formulario sin espacios en los extremos, como los guarda la base de datos. */
export function normalizeInput(raw: CustomerInput): CustomerInput {
  return {
    firstName: raw.firstName.trim(),
    lastName: raw.lastName.trim(),
    phone: raw.phone.trim(),
    email: raw.email.trim(),
    identification: raw.identification.trim(),
    address: raw.address.trim(),
  };
}

/** ¿Es lo mismo? Compara ya normalizado, igual que lo guarda la base de datos. */
export function isSameInput(a: CustomerInput, b: CustomerInput): boolean {
  const x = normalizeInput(a);
  const y = normalizeInput(b);
  return (
    x.firstName === y.firstName &&
    x.lastName === y.lastName &&
    x.phone === y.phone &&
    x.email === y.email &&
    x.identification === y.identification &&
    x.address === y.address
  );
}
