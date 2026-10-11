# Decisiones Transversales — PWA / Offline

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Decisiones que aplican a **toda la PWA**. Se documentan aquí para no repetirlas.

---

## D-PWA-01: Angular PWA con `@angular/pwa`

Usar `@angular/pwa` para service worker y manifest. No usar Workbox directamente ni service worker manual.

**Razón**: integración con el build de Angular. Configuración declarativa. Mantenido por Angular.

---

## D-PWA-02: Estrategia `performance` para el app shell

Cachear el app shell (HTML, JS, CSS, fonts, iconos) con estrategia `performance`.

**Razón**: el shell no cambia entre deploys. Precargarlo hace la app instantánea.

---

## D-PWA-03: Sin cache de datos de Supabase

Los datos de Supabase **no se cachean** en el service worker.

**Razón**: cachear respuestas causaría datos obsoletos, RLS no revalidado, y conflictos con la auth. La caché de datos vive en `resource` y `localStorage`.

---

## D-PWA-04: Detección de conexión con `navigator.onLine`

Usar `navigator.onLine` + eventos `online`/`offline`. Exponer signal global en `core/network/`.

**Limitación**: `navigator.onLine` no detecta si Internet funciona, solo si hay red. Mitigación: si una operación falla por red, se marca offline.

---

## D-PWA-05: Banner global de "sin conexión"

Cuando `isOnline()` es `false`, mostrar banner discreto: "Sin conexión — los cambios no se guardarán".

**Razón**: el usuario debe saber que las escrituras fallarán. El banner desaparece al volver online.

---

## D-PWA-06: Formularios largos guardan borrador en `localStorage`

Los formularios grandes guardan borrador cada cambio (debounce 500 ms). Al recargar, se ofrece restaurar.

**Razón**: si el usuario pierde la conexión, no pierde el trabajo.

---

## D-PWA-07: Actualización con toast de "nueva versión"

Cuando el service worker detecta nueva versión, mostrar toast: "Hay una actualización disponible. [Recargar]". El usuario decide.

**Razón**: forzar la recarga puede hacer perder trabajo. El usuario decide el momento.

---

## D-PWA-08: Web App Manifest completo

Configurar manifest con `name`, `short_name`, `theme_color`, `background_color`, `display: standalone`, `orientation: portrait`, `start_url`, `scope`, `lang`, `dir`.

**Razón**: un manifest completo mejora la experiencia de instalación.

---

## D-PWA-09: Instalación no intrusiva

No mostrar banner de instalación automático. Solo mostrar botón "Instalar app" en login o configuración.

**Razón**: el prompt automático es molesto. El usuario decide.

---

## D-PWA-10: iOS: limitaciones y mitigaciones

Documentar limitaciones de PWA en iOS (sin `beforeinstallprompt`, storage puede limpiarse, push limitado).

**Razón**: 3 de 4 usuarios usan Android. iOS es secundario. Se documenta para futuros talleres.

---

## D-PWA-11: Sin offline real para escrituras

Si el usuario intenta una escritura sin conexión, la operación falla con error claro. El borrador se preserva en `localStorage`.

**Razón**: ADR-006 descarta offline-first. Las colas offline son complejas. El taller tiene WiFi.

---

## D-PWA-12: Iconos y splash screen

Generar todos los tamaños de iconos (192, 512, maskable, apple-touch) y splash screens.

**Razón**: sin iconos correctos, la instalación se ve mal.

**Herramienta**: `pwa-asset-generator`.

---

## D-PWA-13: Sin modo offline explícito

No hay modo offline explícito. La app intenta operar normalmente. Si falla por red, se muestra error. El banner de offline avisa.

**Razón**: un modo offline explícito requiere bloquear acciones proactivamente. Más simple dejar que fallen naturalmente.

---

## D-PWA-14: `ngsw-config.json` versionado

`ngsw-config.json` se versiona en el repo.

**Razón**: cambios en estrategias de caché deben revisarse. No se genera automáticamente.

---

## D-PWA-15: Sin notificaciones push en MVP

No se implementan notificaciones push en MVP.

**Razón**: el taller notifica por WhatsApp/llamada. Push en iOS es limitado. Requiere backend y permisos. No es crítico.

**Fase 2**: evaluar push para "orden lista" si el taller lo pide.

---

## Resumen

| ID       | Decisión                                |
| -------- | --------------------------------------- |
| D-PWA-01 | Angular PWA con `@angular/pwa`          |
| D-PWA-02 | Estrategia `performance` para app shell |
| D-PWA-03 | Sin cache de Supabase                   |
| D-PWA-04 | Detección con `navigator.onLine`        |
| D-PWA-05 | Banner de "sin conexión"                |
| D-PWA-06 | Borradores en `localStorage`            |
| D-PWA-07 | Actualización con toast                 |
| D-PWA-08 | Manifest completo                       |
| D-PWA-09 | Instalación no intrusiva                |
| D-PWA-10 | iOS: limitaciones y mitigaciones        |
| D-PWA-11 | Sin offline real para escrituras        |
| D-PWA-12 | Iconos y splash screen                  |
| D-PWA-13 | Sin modo offline explícito              |
| D-PWA-14 | `ngsw-config.json` versionado           |
| D-PWA-15 | Sin push en MVP                         |

---

## Referencias

- [README de pwa-offline](./README.md)
- [Service Worker](./service-worker.md)
- [ADR-006: PWA online-first](../adr/ADR-006-pwa-online-first.md)

---

_Decisiones Transversales — PWA / Offline v1.0_
