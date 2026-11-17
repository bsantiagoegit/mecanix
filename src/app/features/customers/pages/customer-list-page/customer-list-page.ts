import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthFacade } from '@core/auth';
import { WorkshopFacade } from '@core/workshops';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { CustomerCard } from '../../components/customer-card/customer-card';
import { CustomerDialog } from '../../components/customer-dialog/customer-dialog';
import { CustomerSearch } from '../../components/customer-search/customer-search';
import { CustomerSummary } from '../../models/customer.model';
import { CustomerDialogState } from '../../services/customer-dialog.state';
import { CustomerFormState } from '../../services/customer-form.state';
import { CustomersService } from '../../services/customers.service';

/**
 * UC-CUST-02: lista de clientes del taller con búsqueda y paginación. También registra (UC-CUST-01)
 * y edita (UC-CUST-04) clientes en el mismo modal, sin salir de la lista.
 */
@Component({
  selector: 'app-customer-list-page',
  imports: [Button, Card, CustomerCard, CustomerDialog, CustomerSearch, RouterLink, Skeleton],
  providers: [CustomerFormState, CustomerDialogState],
  templateUrl: './customer-list-page.html',
})
export class CustomerListPage {
  private readonly customers = inject(CustomersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly workshops = inject(WorkshopFacade);
  readonly dialog = inject(CustomerDialogState);
  readonly form = this.dialog.form;

  /** Filas del esqueleto mientras carga. */
  readonly skeletonRows = [1, 2, 3, 4, 5, 6];
  readonly auth = inject(AuthFacade);

  /** Búsqueda guardada en la URL (`?q=`): al volver del detalle la lista queda como estaba. */
  /** Con `withComponentInputBinding`, si la URL no trae `?q=` el router entrega `undefined`. */
  readonly q = input<string | undefined>('');

  /** Texto buscado (ya sin espacios sobrantes). Vacío lista todos. */
  readonly query = signal('');
  readonly items = signal<CustomerSummary[]>([]);
  readonly hasMore = signal(false);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly moreError = signal<string | null>(null);

  /** Registrar y editar clientes es de `owner` y `advisor`; el mecánico no ve los botones. */
  readonly canManage = computed(() => this.auth.hasRole('owner', 'advisor'));
  /** El mecánico solo ve y busca por nombre: la base de datos no le da el resto. */
  readonly byNameOnly = computed(() => this.auth.role() === 'mechanic');
  readonly placeholder = computed(() =>
    this.byNameOnly() ? 'Nombre o apellido' : 'Nombre, celular o cédula',
  );

  /** Se descartan las respuestas de una búsqueda que ya quedó atrás (llegan desordenadas). */
  private requestId = 0;
  private loadedWorkshopId: string | null = null;

  constructor() {
    this.dialog.onSaved = () => this.retry();
    effect(() => {
      const id = this.workshops.activeId();
      const initialQuery = (this.q() ?? '').trim();
      if (id && id !== this.loadedWorkshopId) {
        this.loadedWorkshopId = id;
        untracked(() => {
          this.query.set(initialQuery);
          void this.load(id, initialQuery);
        });
      }
    });
  }

  onSearch(text: string): void {
    if (text === this.query()) return;
    this.query.set(text);
    // La búsqueda queda en la URL (sin añadir al historial) para poder volver a ella.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: text || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    const workshopId = this.workshops.activeId();
    if (workshopId) void this.load(workshopId, text);
  }

  async loadMore(): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (!workshopId || this.isLoadingMore() || !this.hasMore()) return;

    const request = this.requestId;
    this.isLoadingMore.set(true);
    this.moreError.set(null);
    try {
      const page = await this.customers.search(workshopId, this.query(), this.items().length);
      if (request !== this.requestId) return;
      this.items.update((current) => [...current, ...page.items]);
      this.hasMore.set(page.hasMore);
    } catch {
      if (request === this.requestId) {
        this.moreError.set('No se pudieron cargar más clientes. Inténtalo de nuevo.');
      }
    } finally {
      if (request === this.requestId) this.isLoadingMore.set(false);
    }
  }

  retry(): void {
    const workshopId = this.workshops.activeId();
    if (workshopId) void this.load(workshopId, this.query());
  }

  private async load(workshopId: string, query: string): Promise<void> {
    const request = ++this.requestId;
    this.isLoading.set(true);
    this.isLoadingMore.set(false);
    this.loadError.set(null);
    this.moreError.set(null);
    try {
      const page = await this.customers.search(workshopId, query);
      if (request !== this.requestId) return;
      this.items.set(page.items);
      this.hasMore.set(page.hasMore);
    } catch {
      if (request !== this.requestId) return;
      // Un fallo no se muestra como "no hay clientes": se avisa y se ofrece reintentar.
      this.items.set([]);
      this.hasMore.set(false);
      this.loadError.set(
        'No se pudieron cargar los clientes. Revisa tu conexión e inténtalo de nuevo.',
      );
    } finally {
      if (request === this.requestId) this.isLoading.set(false);
    }
  }
}
