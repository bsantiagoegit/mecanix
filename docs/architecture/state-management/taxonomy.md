# Taxonomía del Estado

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Clasificar los **7 tipos de estado** que existen en la aplicación y asignar una herramienta a cada uno.

---

## Los 7 tipos

| Tipo                    | Descripción                                             | Ejemplo                               | Herramienta                     |
| ----------------------- | ------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| **Server state**        | Datos que viven en PostgreSQL. Read-mostly.             | Lista de clientes, detalle de orden.  | `resource` + data service       |
| **Global app state**    | Estado compartido entre features. Persiste entre rutas. | Sesión, taller activo, catálogos.     | NgRx                            |
| **Feature local state** | Estado de un feature, no compartido entre features.     | Filtros de lista, tab activa.         | Signals en servicio del feature |
| **Component state**     | Estado efímero de un componente.                        | Modal abierto, input focus.           | Signals locales                 |
| **Form state**          | Estado de un formulario.                                | Valores, dirty, touched.              | Reactive Forms                  |
| **Derived state**       | Calculado a partir de otro estado.                      | Total de cotización, lista filtrada.  | `computed()`                    |
| **Persisted state**     | Estado que sobrevive a recargas.                        | Borrador de formulario, preferencias. | `localStorage`                  |

---

## Detalle por tipo

### Server state

**Definición**: datos que viven en PostgreSQL y se consultan para mostrar.

**Características**:

- Read-mostly (más lecturas que escrituras).
- Puede cambiar en el servidor sin que el cliente lo sepa.
- Se cachea en el cliente por un tiempo.

**Herramienta**: `resource` + data service.

**Ejemplo**:

```typescript
readonly orders = resource({
  request: () => ({ workshopId: this.workshops.activeId() }),
  loader: ({ request }) => this.ordersService.list(request.workshopId),
});
```

**Cuándo NO usar `resource`**:

- Escrituras (INSERT, UPDATE, DELETE).
- Operaciones transaccionales complejas (RPC).
- Uploads de archivos.

---

### Global app state

**Definición**: estado compartido entre múltiples features. Persiste entre rutas.

**Características**:

- Múltiples consumidores.
- Lógica asíncrona compleja.
- Persiste entre navegaciones.

**Herramienta**: NgRx.

**Ejemplos**:

- `auth`: sesión del usuario.
- `workshops`: taller activo.
- `catalogs`: roles, estados, tipos.

**Cuándo NO usar NgRx**:

- Estado de un solo feature.
- Estado efímero.
- Server state.

---

### Feature local state

**Definición**: estado específico de un feature, compartido entre múltiples componentes del mismo feature.

**Características**:

- Vive dentro de un feature.
- No se comparte con otros features.
- Se puede resetear cuando el feature se destruye.

**Herramienta**: servicio del feature con signals.

**Ejemplo**:

```typescript
@Injectable({ providedIn: 'root' })
export class WorkOrderFiltersState {
  readonly status = signal<WorkOrderStatus | null>(null);
  readonly dateFrom = signal<Date | null>(null);
  readonly dateTo = signal<Date | null>(null);

  reset() {
    this.status.set(null);
    this.dateFrom.set(null);
    this.dateTo.set(null);
  }
}
```

---

### Component state

**Definición**: estado efímero de un componente. No trasciende el componente.

**Características**:

- Vive en el componente.
- Se destruye con el componente.
- No se comparte.

**Herramienta**: signals locales.

**Ejemplos**:

- Modal abierto/cerrado.
- Tab activa.
- Dropdown abierto.
- Input focus.

**Ejemplo**:

```typescript
readonly showCancelModal = signal(false);
readonly activeTab = signal<'summary' | 'photos' | 'history'>('summary');
```

---

### Form state

**Definición**: estado de un formulario.

**Características**:

- Tiene su propio modelo (value, valid, dirty, touched).
- Se inicializa con valores.
- Se valida al enviar.

**Herramienta**: Reactive Forms.

**Ejemplo**:

```typescript
readonly form = inject(FormBuilder).group({
  firstName: ['', Validators.required],
  lastName: ['', Validators.required],
  phone: ['', Validators.required],
});
```

**Cuándo NO usar Reactive Forms**:

- Formularios muy simples (un solo input). Se puede usar `signal` + `[(ngModel)]`. Pero por consistencia, siempre Reactive Forms.

---

### Derived state

**Definición**: estado calculado a partir de otro estado.

**Características**:

- No tiene fuente propia.
- Se recalcula cuando cambia su fuente.
- No tiene side effects.

**Herramienta**: `computed()`.

**Ejemplo**:

```typescript
readonly selectedItems = signal<Item[]>([]);
readonly totalCost = computed(() =>
  this.selectedItems().reduce((sum, i) => sum + i.cost * i.quantity, 0)
);
```

**Cuándo NO usar `computed()`**:

- Si el cálculo tiene side effects (no debería).
- Si el cálculo es muy costoso y no se lee con frecuencia (evaluar `effect()` o memoization manual).

---

### Persisted state

**Definición**: estado que sobrevive a recargas del navegador.

**Características**:

- Se escribe en `localStorage`.
- Se lee al iniciar.
- Se limpia cuando ya no es necesario.

**Herramienta**: `localStorage` + signal + `effect()`.

**Ejemplos**:

- Borrador de formulario.
- Preferencias de UI (tema, idioma).
- Sesión (parcial, vía NgRx).

**Ejemplo**:

```typescript
const DRAFT_KEY = 'work-order-draft';

@Injectable({ providedIn: 'root' })
export class WorkOrderDraftService {
  readonly draft = signal<Partial<WorkOrderForm> | null>(this.loadFromStorage());

  constructor() {
    effect(() => {
      const value = this.draft();
      if (value) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    });
  }

  private loadFromStorage(): Partial<WorkOrderForm> | null {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  clear() {
    this.draft.set(null);
  }
}
```

---

## Matriz resumen

| Tipo                | Herramienta               | Ubicación                | Persistido |
| ------------------- | ------------------------- | ------------------------ | ---------- |
| Server state        | `resource` + data service | Contenedor               | No         |
| Global app state    | NgRx                      | `core/{slice}/`          | Parcial    |
| Feature local state | Signals en servicio       | `features/{f}/services/` | No         |
| Component state     | Signals locales           | Componente               | No         |
| Form state          | Reactive Forms            | Componente               | Borrador   |
| Derived state       | `computed()`              | Componente o servicio    | No         |
| Persisted state     | `localStorage` + signal   | Servicio                 | Sí         |

---

## Referencias

- [README de state-management](./README.md)
- [Decisiones transversales](./decisions.md)
- [Árbol de decisión](./decision-tree.md)

---

_Taxonomía del Estado v1.0_
