import { Injectable, inject } from '@angular/core';
import { mapSupabaseError } from '@core/errors';
import { SupabaseService } from '@core/supabase';
import { VEHICLE_PAGE_SIZE, VehiclePage, VehicleSummary } from '../models/vehicle.model';

/** Fila que devuelve la función `search_vehicles`. */
interface VehicleRow {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  has_key: boolean;
  key_code: string | null;
  owner_id: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
}

/** Acceso a los datos de vehículos (UC-VEH). Los componentes nunca llaman a Supabase. */
@Injectable({ providedIn: 'root' })
export class VehiclesService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Busca vehículos del taller con la función `search_vehicles`: el texto se compara con la placa
   * y el VIN sin espacios ni guiones y sin distinguir mayúsculas. Sin texto lista todos, ordenados
   * por placa, cada uno con su propietario actual.
   *
   * Pide una fila más de las necesarias para saber si hay otra página sin hacer un conteo.
   */
  async search(
    workshopId: string,
    query: string,
    offset = 0,
    limit = VEHICLE_PAGE_SIZE,
  ): Promise<VehiclePage> {
    const { data, error } = await this.supabase.rpc('search_vehicles', {
      p_workshop_id: workshopId,
      p_query: query.trim() === '' ? null : query,
      p_limit: limit + 1,
      p_offset: offset,
    });
    if (error) throw mapSupabaseError(error);

    const rows = (data ?? []) as VehicleRow[];
    return {
      items: rows.slice(0, limit).map((row) => this.toSummary(row)),
      hasMore: rows.length > limit,
    };
  }

  private toSummary(row: VehicleRow): VehicleSummary {
    return {
      id: row.id,
      licensePlate: row.license_plate,
      make: row.make,
      model: row.model,
      year: row.year,
      vin: row.vin,
      hasKey: row.has_key,
      keyCode: row.key_code,
      owner:
        row.owner_id && row.owner_first_name !== null && row.owner_last_name !== null
          ? { id: row.owner_id, firstName: row.owner_first_name, lastName: row.owner_last_name }
          : null,
    };
  }
}
