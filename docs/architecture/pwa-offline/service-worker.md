# Service Worker

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Definir la configuración de `ngsw-config.json`, las estrategias de caching y el manejo del service worker.

---

## `ngsw-config.json`

Ubicación: `ngsw-config.json` en la raíz del proyecto (Angular 21).

```json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": ["/assets/**", "/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"]
      }
    }
  ],
  "dataGroups": [],
  "navigationUrls": ["/**", "!/**/*.*", "!/**/*__*", "!/**/*__*/**"]
}
```

---

## Explicación

### `assetGroups`

**`app`**:

- `installMode: prefetch` — se descarga al instalar el service worker.
- Incluye: `index.html`, JS, CSS, manifest, favicon.
- Estos archivos son el shell de la app. Deben estar siempre disponibles.

**`assets`**:

- `installMode: lazy` — no se descarga al instalar.
- `updateMode: prefetch` — se actualiza cuando hay nueva versión.
- Incluye: imágenes, fonts, SVGs.
- Se cachean la primera vez que se solicitan.

### `dataGroups`

**Vacío**. No se cachean datos de Supabase (D-PWA-03).

**Razón**: cachear respuestas de Supabase causaría datos obsoletos y conflictos con RLS.

### `navigationUrls`

Redirige todas las rutas al `index.html` excepto:

- Archivos con extensión (`!/**/*.*`).
- Archivos con doble underscore (`!/**/*__*`).

**Razón**: necesario para SPA con routing. Cualquier ruta desconocida va al `index.html` y Angular maneja el routing.

---

## Estrategias de caching

| Asset             | Estrategia             | Razón                                                                                                                           |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`      | Prefetch               | Shell de la app                                                                                                                 |
| JS, CSS           | Prefetch               | Shell de la app                                                                                                                 |
| Manifest          | Prefetch               | Necesario para instalación                                                                                                      |
| Favicon           | Prefetch               | Siempre visible                                                                                                                 |
| Assets (imágenes) | Lazy + prefetch update | Se cargan cuando se necesitan                                                                                                   |
| Fonts             | Lazy + prefetch update | Se cargan cuando se necesitan                                                                                                   |
| Datos Supabase    | **Sin cache**          | Datos en vivo                                                                                                                   |
| Fotos (Storage)   | **Sin cache**          | URLs firmadas con expiración. Ver [Estrategia de Storage](../storage/README.md) y [Policies de Storage](../storage/policies.md) |

---

## Actualización del service worker

El service worker se actualiza automáticamente cuando el navegador detecta un nuevo `ngsw.json`. El evento `VERSION_READY` se emite y se maneja con el `UpdateService` (ver [`updates.md`](./updates.md)).

---

## Habilitación en `app.config.ts`

```typescript
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // ...
  ],
};
```

**Notas**:

- `enabled: environment.production` — solo en producción. En desarrollo, el service worker interfiere con el HMR.
- `registrationStrategy: 'registerWhenStable:30000'` — espera 30 segundos después de que la app esté estable para registrar el service worker. Esto evita bloquear la carga inicial.

---

## Comandos

### Habilitar PWA en el proyecto

```bash
ng add @angular/pwa
```

Esto:

- Agrega `@angular/service-worker` a `package.json`.
- Crea `ngsw-config.json`.
- Crea `manifest.webmanifest`.
- Agrega los iconos por defecto.
- Actualiza `angular.json` para habilitar el service worker en producción.

### Build de producción

```bash
ng build --configuration production
```

El build genera:

- `ngsw-worker.js`
- `ngsw.json`
- Los archivos de la app con hashes.

---

## Verificación

Después del build:

1. **`ngsw.json`** debe existir en `dist/`.
2. **`ngsw-worker.js`** debe existir en `dist/`.
3. En DevTools → Application → Service Workers, debe aparecer registrado.
4. En DevTools → Application → Cache Storage, deben aparecer los grupos `app` y `assets`.

---

## Referencias cruzadas

### Con Storage

Las fotos servidas desde Supabase Storage **no se cachean** en el service worker. La caché de fotos vive en el data service del feature, no en el service worker.

- [Estrategia de Storage](../storage/README.md) — visión general.
- [Policies de Storage](../storage/policies.md) — policies de acceso a las fotos.
- [Flujo de upload](../storage/upload-flow.md) — cómo se suben y descargan las fotos.

### Con Frontend

- [Manejo de errores](../frontend/error-handling.md) — cómo se manejan los errores de red.
- [Data flow](../frontend/data-flow.md) — flujo de datos entre frontend y Supabase.

### Con Estado

- [Estrategia de estado](../state-management/README.md) — cómo se maneja el estado de red y borradores.
- [D-STATE-09: `localStorage` para borradores](../state-management/decisions.md) — coincide con D-PWA-06.

### Con ADRs

- [ADR-006: PWA online-first](../adr/ADR-006-pwa-online-first.md) — decisión principal de la estrategia.
- [ADR-009: Storage privado con URLs firmadas](../adr/ADR-009-storage-privado.md) — por qué las fotos no se cachean.

## Referencias

- [README de pwa-offline](./README.md)
- [Decisiones transversales](./decisions.md)
- [Actualizaciones](./updates.md)
- [Angular Service Worker config](https://angular.dev/guide/service-worker-config)

---

_Service Worker v1.1_
