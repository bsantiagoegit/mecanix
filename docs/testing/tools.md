# Herramientas de Testing

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Definir las herramientas de testing y cómo se configuran.

---

## Vitest (unit + integration)

**Instalación**:

```bash
pnpm add -D vitest @vitest/coverage-v8 @vitest/ui jsdom @testing-library/angular @testing-library/user-event
```

**Configuración** (`vitest.config.ts`):

```typescript
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/testing/setup.ts'],
    include: ['src/**/*.spec.ts', 'supabase/tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/*.spec.ts', '**/*.mock.ts', '**/testing/**', '**/*.model.ts'],
    },
  },
});
```

**Comandos**:

```bash
pnpm test           # corre todos
pnpm test:watch     # modo watch
pnpm test:coverage  # con cobertura
pnpm test:ui        # UI interactiva
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

Scripts a agregar en `package.json` cuando se implemente el setup de testing:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:integration": "vitest run supabase/tests",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:headed": "playwright test --headed",
    "lint": "ng lint",
    "typecheck": "tsc --noEmit"
  }
}
```

> Nota: el package.json actual tiene "test": "ng test" (Karma). Se reemplazará por Vitest cuando se implemente el setup. Esta tabla documenta el estado objetivo, no el actual.

---

## Referencias

- [README de testing](./README.md)
- [Decisiones transversales](./decisions.md)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Testing Library Angular](https://testing-library.com/docs/angular-testing-library/intro/)

---

_Herramientas de Testing v1.1_
