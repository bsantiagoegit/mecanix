import { Injectable, inject } from '@angular/core';
import { NotFoundError, mapSupabaseError } from '@core/errors';
import { SupabaseService } from '@core/supabase';
import {
  CUSTOMER_PAGE_SIZE,
  Customer,
  CustomerInput,
  CustomerMatch,
  CustomerPage,
  CustomerSummary,
} from '../models/customer.model';
import { DuplicateIdentificationError } from '../models/duplicate-identification.error';

interface CustomerRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  identification: string | null;
}

/** Fila completa de `customers` (solo la leen `owner` y `advisor`). */
interface CustomerFullRow extends CustomerRow {
  phone: string;
  address: string | null;
}

/** Nombre del índice único de identificación por taller (migración de clientes). */
const IDENTIFICATION_INDEX = 'idx_customers_identification';

/** Máximo de coincidencias que se muestran en el aviso de teléfono repetido. */
const PHONE_MATCH_LIMIT = 5;

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

  /** Un cliente por id, o `null` si no existe, está eliminado o es de otro taller. */
  async getById(id: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle<CustomerFullRow>();
    if (error) throw mapSupabaseError(error);
    return data ? this.toCustomer(data) : null;
  }

  /**
   * Registra un cliente (UC-CUST-01). `DuplicateIdentificationError` si otro cliente del taller
   * ya tiene esa identificación; la base de datos normaliza y valida los datos.
   */
  async create(workshopId: string, input: CustomerInput): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .insert({ workshop_id: workshopId, ...this.toRow(input) })
      .select('*')
      .single<CustomerFullRow>();
    if (error) throw await this.toWriteError(error, workshopId, input);
    return this.toCustomer(data);
  }

  /**
   * Edita un cliente (UC-CUST-04). `NotFoundError` si ya no existe o no se puede editar;
   * `DuplicateIdentificationError` si la identificación nueva choca con otro cliente.
   */
  async update(workshopId: string, id: string, input: CustomerInput): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .update(this.toRow(input))
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .maybeSingle<CustomerFullRow>();
    if (error) throw await this.toWriteError(error, workshopId, input, id);
    if (!data) throw new NotFoundError('customer', id);
    return this.toCustomer(data);
  }

  /** Otros clientes del taller con el mismo teléfono (aviso no bloqueante de posible duplicado). */
  async findByPhone(
    workshopId: string,
    phone: string,
    excludeId?: string,
  ): Promise<CustomerMatch[]> {
    let query = this.supabase
      .from('customers')
      .select('id, first_name, last_name, phone')
      .eq('workshop_id', workshopId)
      .eq('phone', phone.trim())
      .is('deleted_at', null);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query.order('last_name').limit(PHONE_MATCH_LIMIT);
    if (error) throw mapSupabaseError(error);
    return ((data ?? []) as CustomerFullRow[]).map((row) => this.toMatch(row));
  }

  /** El cliente del taller con esa identificación (sin distinguir mayúsculas), o `null`. */
  async findByIdentification(
    workshopId: string,
    identification: string,
    excludeId?: string,
  ): Promise<CustomerMatch | null> {
    let query = this.supabase
      .from('customers')
      .select('id, first_name, last_name, phone')
      .eq('workshop_id', workshopId)
      .eq('identification', identification.trim().toUpperCase())
      .is('deleted_at', null);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query.limit(1).maybeSingle<CustomerFullRow>();
    if (error) throw mapSupabaseError(error);
    return data ? this.toMatch(data) : null;
  }

  /** Traduce un fallo de escritura; el choque con la identificación única lleva al cliente existente. */
  private async toWriteError(
    error: { code?: string; message: string },
    workshopId: string,
    input: CustomerInput,
    excludeId?: string,
  ): Promise<Error> {
    if (
      error.code === '23505' &&
      error.message.includes(IDENTIFICATION_INDEX) &&
      input.identification
    ) {
      const existing = await this.findByIdentification(
        workshopId,
        input.identification,
        excludeId,
      ).catch(() => null);
      return new DuplicateIdentificationError(input.identification.toUpperCase(), existing);
    }
    return mapSupabaseError(error);
  }

  private toRow(input: CustomerInput) {
    return {
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      email: input.email,
      identification: input.identification,
      address: input.address,
    };
  }

  private toCustomer(row: CustomerFullRow): Customer {
    return { ...this.toSummary(row), address: row.address };
  }

  private toMatch(row: CustomerFullRow): CustomerMatch {
    return { id: row.id, fullName: `${row.first_name} ${row.last_name}`, phone: row.phone };
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
