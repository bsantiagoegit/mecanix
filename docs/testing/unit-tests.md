# Unit Tests

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir cómo se escriben los unit tests de servicios y componentes.

---

## Data services

### Estructura

```typescript
// customers.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { CustomersService } from './customers.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { DataError, ValidationError } from '../../../core/errors';

describe('CustomersService', () => {
  let service: CustomersService;
  let supabaseMock: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    supabaseMock = createSupabaseMock();
    TestBed.configureTestingModule({
      providers: [CustomersService, { provide: SupabaseClient, useValue: supabaseMock }],
    });
    service = TestBed.inject(CustomersService);
  });

  describe('list', () => {
    it('devuelve clientes activos del taller', async () => {
      supabaseMock._mockResponse('customers', 'select', { data: [customerMock], error: null });

      const result = await service.list(WORKSHOP_ID);

      expect(result).toHaveLength(1);
      expect(supabaseMock.from).toHaveBeenCalledWith('customers');
    });

    it('lanza DataError si Supabase falla', async () => {
      supabaseMock._mockResponse('customers', 'select', { data: null, error: { code: '500' } });

      await expect(service.list(WORKSHOP_ID)).rejects.toThrow(DataError);
    });
  });

  describe('create', () => {
    it('lanza ValidationError si la identificación está duplicada', async () => {
      supabaseMock._mockResponse('customers', 'insert', {
        data: null,
        error: { code: '23505' },
      });

      await expect(service.create(createDto)).rejects.toThrow(ValidationError);
    });
  });
});
```

### Mock de Supabase

En `src/testing/mocks/supabase.mock.ts`:

```typescript
export function createSupabaseMock() {
  const responses: Record<string, any> = {};

  const from = vi.fn((table: string) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve(responses[table]?.single ?? { data: null, error: null })),
      then: (resolve: any) =>
        Promise.resolve(responses[table]?.select ?? { data: null, error: null }).then(resolve),
    };
    return chain;
  });

  return {
    from,
    _mockResponse(table: string, op: string, response: any) {
      responses[table] = { ...responses[table], [op]: response };
    },
  };
}
```

**Nota**: el mock real es más complejo. Este es el esqueleto.

---

## Componentes dumb

### Estructura

```typescript
// customer-card.component.spec.ts
import { render, screen, userEvent } from '@testing-library/angular';
import { CustomerCardComponent } from './customer-card.component';

describe('CustomerCardComponent', () => {
  it('muestra el nombre y teléfono del cliente', async () => {
    await render(CustomerCardComponent, {
      inputs: { customer: customerMock },
    });

    expect(screen.getByText('Juan Pérez')).toBeTruthy();
    expect(screen.getByText('+593 99 123 4567')).toBeTruthy();
  });

  it('emite edit con el cliente al tocar "Editar"', async () => {
    const { fixture } = await render(CustomerCardComponent, {
      inputs: { customer: customerMock },
    });
    const editSpy = vi.fn();
    fixture.componentInstance.edit.subscribe(editSpy);

    await userEvent.click(screen.getByRole('button', { name: /editar/i }));

    expect(editSpy).toHaveBeenCalledWith(customerMock);
  });

  it('muestra badge "Sin clave" si hasKey es false', async () => {
    await render(CustomerCardComponent, {
      inputs: { customer: { ...customerMock, hasKey: false } },
    });

    expect(screen.getByText(/sin clave/i)).toBeTruthy();
  });
});
```

### Queries preferidas

| Prioridad | Query                  | Cuándo                           |
| --------- | ---------------------- | -------------------------------- |
| 1         | `getByRole`            | Botones, links, headings, inputs |
| 2         | `getByLabelText`       | Inputs con label                 |
| 3         | `getByPlaceholderText` | Inputs sin label                 |
| 4         | `getByText`            | Texto estático                   |
| 5         | `getByTestId`          | Último recurso                   |

**Razón**: `getByRole` testea accesibilidad. Si no hay role, hay problema de accesibilidad.

---

## Contenedores

### Estructura

```typescript
// customer-list.component.spec.ts
import { render, screen } from '@testing-library/angular';
import { CustomerListComponent } from './customer-list.component';
import { CustomersService } from '../services/customers.service';
import { WorkshopStore } from '../../../core/workshops/workshop.store';

describe('CustomerListComponent', () => {
  it('muestra skeleton mientras carga', async () => {
    const customersServiceMock = {
      list: vi.fn(() => new Promise(() => {})), // nunca resuelve
    };

    await render(CustomerListComponent, {
      providers: [
        { provide: CustomersService, useValue: customersServiceMock },
        { provide: WorkshopStore, useValue: { activeId: () => WORKSHOP_ID } },
      ],
    });

    expect(screen.getByTestId('skeleton')).toBeTruthy();
  });

  it('muestra los clientes cuando carga', async () => {
    const customersServiceMock = {
      list: vi.fn().mockResolvedValue([customerMock]),
    };

    await render(CustomerListComponent, {
      providers: [
        { provide: CustomersService, useValue: customersServiceMock },
        { provide: WorkshopStore, useValue: { activeId: () => WORKSHOP_ID } },
      ],
    });

    expect(await screen.findByText('Juan Pérez')).toBeTruthy();
  });
});
```

---

## Guards

```typescript
// auth.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthStore } from './auth.store';

describe('authGuard', () => {
  it('redirige a /auth/login si no autenticado', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { isAuthenticated: () => false } },
        { provide: Router, useValue: { parseUrl: vi.fn((url) => url) } },
      ],
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe('/auth/login');
  });

  it('permite acceso si autenticado', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStore, useValue: { isAuthenticated: () => true } }],
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe(true);
  });
});
```

---

## Stores NgRx

```typescript
// auth.reducer.spec.ts
import { authReducer, initialState } from './auth.reducer';
import { AuthActions } from './auth.actions';

describe('authReducer', () => {
  it('setea loading=true en login', () => {
    const state = authReducer(initialState, AuthActions.login({ email: 'a@b.com', password: 'x' }));
    expect(state.isLoading).toBe(true);
  });

  it('setea user en loginSuccess', () => {
    const user = { id: '1', email: 'a@b.com', fullName: 'Test' };
    const state = authReducer(initialState, AuthActions.loginSuccess({ user }));
    expect(state.user).toEqual(user);
    expect(state.isLoading).toBe(false);
  });
});
```

---

## Referencias

- [README de testing](./README.md)
- [Decisiones transversales](./decisions.md)
- [Integration tests](./integration-tests.md)
- [Convenciones](./conventions.md)

---

_Unit Tests v1.0_
