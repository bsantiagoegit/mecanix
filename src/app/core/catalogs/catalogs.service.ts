import { Injectable, inject } from '@angular/core';
import { mapSupabaseError } from '@core/errors';
import { CatalogRole } from './catalogs.model';
import { SupabaseService } from '@core/supabase';
import { Observable, from, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CatalogsService {
  private readonly supabase = inject(SupabaseService).client;

  listRoles(): Observable<CatalogRole[]> {
    return from(this.supabase.from('roles').select('*')).pipe(
      map(({ data, error }) => {
        if (error) throw mapSupabaseError(error);
        return data ?? [];
      }),
    );
  }
}
