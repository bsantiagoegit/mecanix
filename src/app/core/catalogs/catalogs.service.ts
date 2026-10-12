import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../supabase';
import { Role } from './catalogs.models';

@Injectable({ providedIn: 'root' })
export class CatalogsService {
  private readonly supabase = inject(SupabaseService).client;

  listRoles(): Observable<Role[]> {
    return from(this.supabase.from('roles').select('*')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data ?? [];
      }),
    );
  }
}
