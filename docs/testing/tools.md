# Herramientas de Testing

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.2
- **Fecha:** Octubre 2026

---

## Propósito

Definir las herramientas de testing y cómo se configuran.

---

## Vitest (unit + integration)

**Angular 21 trae Vitest nativo** vía el builder `@angular/build:unit-test` (`ng test`). **No** se usa `vitest.config.ts` ni `@analogjs/vite-plugin-angular`: ese plugin es para proyectos Vite sin el builder de Angular, y aquí genera un paquete sin uso. La configuración vive en `angular.json`, no en un archivo Vitest aparte.

**Instalación**:

```bash
pnpm add -D vitest @vitest/coverage-v8 @vitest/ui jsdom @testing-library/angular @testing-library/user-event @testing-library/jest-dom
```

**Configuración** (`angular.json`, target `test` del proyecto):

```json
"test": {
  "builder": "@angular/build:unit-test",
  "options": {
    "setupFiles": ["src/testing/setup.ts"],
    "exclude": ["supabase/tests/**"],
    "coverageReporters": ["text", "html", "lcov"],
    "coverageThresholds": { "statements": 70, "branches": 60, "functions": 70, "lines": 70 }
  },
  "configurations": {
    "integration": {
      "include": ["supabase/tests/**/*.spec.ts"],
      "exclude": [],
      "coverage": false
    }
  }
}
```

**Por qué `exclude`/`configurations.integration` y no `include` combinado**: el builder solo soporta un `include` activo a la vez. La corrida por defecto (unit) excluye `supabase/tests/`; la configuración `integration` (`ng test --configuration=integration`) apunta solo ahí. Así no se mezclan en la misma corrida (D-TEST-01: niveles separados).

**`src/testing/setup.ts`**:

```typescript
import '@testing-library/jest-dom/vitest';
```

**No llamar `cleanup()` de `@testing-library/angular` aquí.** El builder de Angular ya resetea el `TestBed` entre tests; llamar `cleanup()` en un `afterEach` global choca con ese reset (`Cannot configure the test module when the test module has already been instantiated`) y rompe specs que no usan `render()`.

**Comandos**:

```bash
pnpm test              # unit, corre todos
pnpm test:watch        # modo watch
pnpm test:coverage     # con cobertura (usa los thresholds de angular.json)
pnpm test:ui           # UI interactiva de Vitest
pnpm test:integration  # solo supabase/tests/**/*.spec.ts
```

---

## Playwright (E2E)

**Instalación**:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install
```

**Configuración** (`playwright.config.ts`):

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
  },
});
```

**Comandos**:

```bash
pnpm e2e           # corre todos
pnpm e2e:ui        # modo UI
pnpm e2e:headed    # con navegador visible
```

---

## Supabase local (integration)

**Requisitos**: Docker instalado.

**Comandos**:

```bash
supabase start          # levanta PostgreSQL + Auth + Storage + PostgREST
supabase stop           # detiene
supabase db reset       # resetea DB con migraciones + seed
supabase status         # muestra URLs y claves
```

**URL local**: `http://localhost:54321`.

**Conexión desde tests**:

```typescript
import { Client } from 'pg';

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres',
});
await client.connect();
```

**Nota**: el puerto `54322` es el de PostgreSQL directo. El `54321` es el de PostgREST.

---

## Testing Library Angular

**Instalación**: ya incluida con Vitest.

**Uso**:

```typescript
import { render, screen, userEvent } from '@testing-library/angular';

await render(CustomerCardComponent, {
  inputs: { customer: customerMock },
});
```

**Queries recomendadas**:

- `getByRole('button', { name: 'Guardar' })` — preferido.
- `getByLabelText('Email')` — para inputs.
- `getByText('Juan Pérez')` — para texto.
- `getByTestId('customer-card')` — último recurso.

---

## `pg` (para RLS y triggers)

**Instalación**:

```bash
pnpm add -D pg @types/pg
```

**Uso**:

```typescript
import { Client } from 'pg';

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres',
});
await client.connect();
const { rows } = await client.query('SELECT * FROM customers');
```

**Simular usuario autenticado**:

```typescript
await client.query(
  `SET request.jwt.claims = '${JSON.stringify({ sub: userId, role: 'authenticated' })}'`,
);
```

**Razón**: permite testear RLS sin pasar por PostgREST.

---

## Comandos pnpm

Ya configurados en `package.json` (el builder `@angular/build:unit-test` corre Vitest por debajo de `ng test`, no hay un binario `vitest` separado):

```json
{
  "scripts": {
    "test": "ng test",
    "test:watch": "ng test --watch",
    "test:coverage": "ng test --coverage",
    "test:ui": "ng test --ui",
    "test:integration": "ng test --configuration=integration",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:headed": "playwright test --headed",
    "typecheck": "tsc --noEmit"
  }
}
```

**`lint` pendiente**: no hay linter instalado todavía (requiere `ng add @angular-eslint/schematics`, una decisión aparte). Se agrega el script cuando se decida.

---

## Referencias

- [README de testing](./README.md)
- [Decisiones transversales](./decisions.md)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Testing Library Angular](https://testing-library.com/docs/angular-testing-library/intro/)

---

_Herramientas de Testing v1.2_
