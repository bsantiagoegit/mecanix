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
