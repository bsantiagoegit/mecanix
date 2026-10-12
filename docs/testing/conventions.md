# Convenciones de Testing

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir convenciones de naming, ubicación y estructura de tests.

---

## Naming

| Tipo                       | Sufijo        | Ubicación                  | Ejemplo                         |
| -------------------------- | ------------- | -------------------------- | ------------------------------- |
| Unit test                  | `.spec.ts`    | Junto al archivo           | `customers.service.spec.ts`     |
| Integration test (RLS)     | `.spec.ts`    | `supabase/tests/rls/`      | `customers.spec.ts`             |
| Integration test (trigger) | `.spec.ts`    | `supabase/tests/triggers/` | `work-order-sequence.spec.ts`   |
| Integration test (RPC)     | `.spec.ts`    | `supabase/tests/rpcs/`     | `transition_work_order.spec.ts` |
| E2E test                   | `.spec.ts`    | `e2e/specs/`               | `work-order-flow.spec.ts`       |
| Mock                       | `.mock.ts`    | `src/testing/mocks/`       | `customer.mock.ts`              |
| Factory                    | `.factory.ts` | `src/testing/factories/`   | `customer.factory.ts`           |
| Util                       | `.ts`         | `src/testing/utils/`       | `db.ts`                         |

---

## Estructura de un test

```typescript
describe('NombreDelSujeto', () => {
  // Setup
  let service: MyService;
  let dependencyMock: any;

  beforeEach(() => {
    dependencyMock = createMock();
    TestBed.configureTestingModule({
      providers: [MyService, { provide: Dependency, useValue: dependencyMock }],
    });
    service = TestBed.inject(MyService);
  });

  // Agrupación por método o escenario
  describe('nombreDelMetodo', () => {
    it('hace X cuando Y', async () => {
      // Arrange
      const input = createInput();

      // Act
      const result = await service.nombreDelMetodo(input);

      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

**Regla**: patrón Arrange-Act-Assert. Cada test tiene setup, acción y verificación.

---

## Nombres de tests

**Formato**: `hace X cuando Y` o `debería X cuando Y`.

**Buenos**:

- `devuelve clientes activos del taller`
- `lanza DataError si Supabase falla`
- `redirige a /auth/login si no autenticado`
- `muestra skeleton mientras carga`

**Malos**:

- `test 1`
- `should work`
- `customers list`
- `prueba de list`

**Razón**: el nombre del test es documentación. Al leer la salida de tests, debe quedar claro qué falló.

---

## Mocks

### Ubicación

- **Mocks de entidades**: `src/testing/mocks/{entity}.mock.ts`.
- **Mocks de servicios**: dentro del `.spec.ts` que los usa (si son específicos) o en `src/testing/mocks/` (si son compartidos).

### Estructura de mock de entidad

```typescript
// src/testing/mocks/customer.mock.ts
import { Customer } from '../../app/features/customers/models/customer.model';

export const customerMock: Customer = {
  id: 'cust-1',
  workshopId: 'ws-1',
  firstName: 'Juan',
  lastName: 'Pérez',
  phone: '+593 99 123 4567',
  email: 'juan@example.com',
  identification: '1234567890',
  address: 'Av. Siempre Viva 123',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
};

export const customerMock2: Customer = {/* ... */};
```

### Reglas

- **Un mock por entidad** como base.
- **Variantes** con sufijo numérico o descriptivo (`customerMockWithoutKey`).
- **No mutar** mocks entre tests.
- **Exportar** mocks desde `src/testing/mocks/index.ts` (barrel permitido en testing).

---

## Factories

Para crear entidades con valores customizados:

```typescript
// src/testing/factories/customer.factory.ts
import { Customer } from '../../app/features/customers/models/customer.model';
import { customerMock } from '../mocks/customer.mock';

export function createCustomer(overrides: Partial<Customer> = {}): Customer {
  return { ...customerMock, ...overrides };
}
```

**Uso**:

```typescript
const customer = createCustomer({ firstName: 'María' });
```

**Razón**: evita duplicar el objeto completo cuando solo cambia un campo.

---

## Setup compartido

`src/testing/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/angular';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

**Registro** en `vitest.config.ts`:

```typescript
test: {
  setupFiles: ['src/testing/setup.ts'],
}
```

---

## Qué NO hacer

- **No usar `setTimeout` con tiempos fijos** (`await new Promise(r => setTimeout(r, 1000))`). Usar `waitFor` o `findBy*`.
- **No usar `fixture.detectChanges()` manual** salvo que sea necesario. Testing Library lo maneja.
- **No testear implementación** (`expect(service['privateMethod']).toHaveBeenCalled()`). Testear comportamiento.
- **No compartir estado entre tests**. Cada test tiene su setup.
- **No usar `describe.only` o `it.only`** en commits. Bloquea los demás tests.

---

## Cobertura: cómo interpretarla

- **Coverage no es calidad**. 100% coverage con tests malos no sirve.
- **Coverage ayuda a encontrar huecos**, no a medir calidad.
- **No perseguir 100%**. 70-80% global es suficiente.
- **Priorizar cobertura en capas críticas**: data services, RLS, RPCs, triggers.

---

## Referencias

- [README de testing](./README.md)
- [Decisiones transversales](./decisions.md)
- [Unit tests](./unit-tests.md)
- [Integration tests](./integration-tests.md)
- [E2E tests](./e2e-tests.md)

---

_Convenciones de Testing v1.0_
