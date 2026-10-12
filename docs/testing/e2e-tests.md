# E2E Tests

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir cómo se escriben los tests E2E con Playwright.

---

## Setup

```bash
pnpm exec playwright install
```

**Configuración**: ver [`tools.md`](./tools.md).

**Requisitos**: la app debe estar corriendo en `http://localhost:4200` (o la URL configurada).

---

## Flujos críticos a testear

| #   | Flujo                                                            | Casos de uso                                              |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | Login → crear orden → registrar intake → cerrar                  | UC-AUTH-01, UC-WO-01, UC-WO-02, UC-WO-12                  |
| 2   | Login → inspeccionar → hallazgo → reparación → cotizar → aprobar | UC-WO-06, UC-INSP-02, UC-REP-01, UC-QUOTE-01, UC-QUOTE-04 |
| 3   | Login → crear cliente → crear vehículo → crear orden             | UC-CUST-01, UC-VEH-01, UC-WO-01                           |
| 4   | Cambio de taller activo                                          | UC-WS-05                                                  |
| 5   | Cambio de tema (persistencia)                                    | D-DS-16                                                   |

**Total E2E en MVP**: ~10 tests (uno o dos por flujo).

---

## Patrón

```typescript
// e2e/specs/work-order-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Flujo: crear orden', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill('advisor@workshop.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL('/work-orders');
  });

  test('crear orden y confirmar recepción', async ({ page }) => {
    await page.getByRole('link', { name: 'Órdenes' }).click();
    await page.getByRole('button', { name: 'Nueva orden' }).click();

    // Cliente
    await page.getByLabel('Cliente').fill('Juan');
    await page.getByRole('option', { name: 'Juan Pérez' }).click();

    // Vehículo
    await page.getByLabel('Vehículo').fill('ABC');
    await page.getByRole('option', { name: 'ABC-1234' }).click();

    // Problema
    await page.getByLabel('Problema reportado').fill('Ruido al frenar');

    // Crear
    await page.getByRole('button', { name: 'Crear orden' }).click();
    await expect(page).toHaveURL(/\/work-orders\/[\w-]+/);
    await expect(page.getByText('Borrador')).toBeVisible();

    // Confirmar recepción
    await page.getByRole('button', { name: 'Confirmar recepción' }).click();
    await page.getByLabel('Rayones').fill('Ninguno');
    await page.getByLabel('Golpes').fill('Ninguno');
    // Subir 4 fotos
    for (const side of ['frente', 'atrás', 'izquierda', 'derecha']) {
      await page.getByTestId(`upload-${side}`).setInputFiles('e2e/fixtures/photo.jpg');
    }
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.getByText(/OT-\d{4}-\d{4}/)).toBeVisible();
  });
});
```

---

## Fixtures

**Ubicación**: `e2e/fixtures/`.

**Contenido**:

- `photo.jpg` — foto de prueba para uploads.
- `pdf.pdf` — PDF de prueba.
- `seed.json` — datos de seed (si no se usa el seed de Supabase).

---

## Helpers

**Ubicación**: `e2e/helpers/`.

```typescript
// e2e/helpers/auth.ts
export async function loginAs(page: Page, email: string) {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL('/work-orders');
}
```

---

## Mock de cámara

Playwright permite mockear la cámara:

```typescript
test.use({
  permissions: ['camera'],
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
});
```

**Razón**: la app usa la cámara para el intake. En CI no hay cámara real.

---

## Mock de red

Para simular offline:

```typescript
await page.context().setOffline(true);
// ...
await page.context().setOffline(false);
```

**Razón**: testear el banner de offline.

---

## Correr E2E

```bash
pnpm e2e               # headless
pnpm e2e:headed        # con navegador
pnpm e2e:ui            # modo UI (debug)
pnpm e2e -- --project=mobile-chrome   # solo móvil
```

---

## En CI

- E2E corre solo en PRs a `main` (no en cada push).
- 3 proyectos: chromium, mobile-chrome, mobile-safari.
- Retries: 2 (para lidiar con flakiness).

**Nota**: configuración detallada va en Operations (entregable 16).

---

## Referencias

- [README de testing](./README.md)
- [Decisiones transversales](./decisions.md)
- [Herramientas](./tools.md)
- [Playwright](https://playwright.dev/)

---

_E2E Tests v1.0_
