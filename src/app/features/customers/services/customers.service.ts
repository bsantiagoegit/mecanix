import { Injectable, inject } from '@angular/core';
import { mapSupabaseError } from '@core/errors';
import { SupabaseService } from '@core/supabase';
import { CUSTOMER_PAGE_SIZE, CustomerPage, CustomerSummary } from '../models/customer.model';

interface CustomerRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  identification: string | null;
}

/** Acceso a los datos de clientes (UC-CUST). Los componentes nunca llaman a Supabase. */
@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Busca clientes del taller con la función `search_customers`: cada palabra de `query` debe
   * coincidir en nombre, apellido, teléfono o identificación (el mecánico solo busca por
   * nombre). Sin texto lista todos, ordenados por apellido y nombre.
   *
   * Pide una fila más de las necesarias para saber si hay otra página sin hacer un conteo.
   */
  async search(
    workshopId: string,
    query: string,
    offset = 0,
    limit = CUSTOMER_PAGE_SIZE,
  ): Promise<CustomerPage> {
    const { data, error } = await this.supabase.rpc('search_customers', {
      p_workshop_id: workshopId,
      p_query: query.trim() === '' ? null : query,
      p_limit: limit + 1,
      p_offset: offset,
    });
    if (error) throw mapSupabaseError(error);

    const rows = (data ?? []) as CustomerRow[];
    return {
      items: rows.slice(0, limit).map((row) => this.toSummary(row)),
      hasMore: rows.length > limit,
    };
  }

  private toSummary(row: CustomerRow): CustomerSummary {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      email: row.email,
      identification: row.identification,
    };
  }
}
