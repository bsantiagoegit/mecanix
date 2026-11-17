/** Cuántos vehículos se piden por página en la lista (UC-VEH-02). */
export const VEHICLE_PAGE_SIZE = 20;

/** El propietario actual de un vehículo. Todos los roles ven su nombre (el mechanic, solo eso). */
export interface VehicleOwner {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Vehículo tal como lo devuelve la búsqueda. `owner` es `null` si no tiene propietario actual.
 * `keyCode` está solo si `hasKey`: todos los roles la ven (D-DS-17).
 */
export interface VehicleSummary {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  hasKey: boolean;
  keyCode: string | null;
  owner: VehicleOwner | null;
}

/** Una página de resultados; `hasMore` indica si quedan más por cargar. */
export interface VehiclePage {
  items: VehicleSummary[];
  hasMore: boolean;
}
