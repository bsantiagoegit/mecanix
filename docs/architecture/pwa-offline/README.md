# Estrategia PWA / Offline

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026
- **Estrategia:** Online-first con tolerancia a fallos (ADR-006)
- **Próxima revisión:** Al implementar el primer feature completo

---

## Propósito

Define la configuración de la PWA y la estrategia de tolerancia a fallos de conexión.

**No incluye** offline-first real (descartado en ADR-006). **No incluye** IndexedDB. **No incluye** notificaciones push (Fase 2).

---

## Orden de lectura

1. [`decisions.md`](./decisions.md) — Decisiones transversales (D-PWA-01 a D-PWA-15). **Empieza aquí.**
2. [`service-worker.md`](./service-worker.md) — Configuración de `ngsw-config.json`.
3. [`manifest.md`](./manifest.md) — Web App Manifest + iconos.
4. [`network.md`](./network.md) — Detección online/offline + banner.
5. [`updates.md`](./updates.md) — Actualización de la app.
6. [`install.md`](./install.md) — Instalación en móvil.
7. [`ios-limitations.md`](./ios-limitations.md) — Limitaciones de iOS.

---

## Principios

1. **Online-first**: la app requiere conexión para escrituras.
2. **Cache del shell**: assets estáticos se cachean con estrategia `performance`.
3. **Sin cache de Supabase**: los datos no se cachean en el service worker.
4. **Borradores en `localStorage`**: los formularios no pierden trabajo.
5. **Banner de offline**: el usuario sabe cuándo está sin conexión.
6. **Actualización no intrusiva**: el usuario decide cuándo recargar.
7. **Instalación opcional**: la app funciona sin instalarse.

---

## Estado actual

| Documento            | Versión | Estado     |
| -------------------- | ------- | ---------- |
| `decisions.md`       | 1.0     | ✅ Estable |
| `service-worker.md`  | 1.0     | ✅ Estable |
| `manifest.md`        | 1.0     | ✅ Estable |
| `network.md`         | 1.0     | ✅ Estable |
| `updates.md`         | 1.0     | ✅ Estable |
| `install.md`         | 1.0     | ✅ Estable |
| `ios-limitations.md` | 1.0     | ✅ Estable |

---

## Referencias

- [ADR-006: PWA online-first](../adr/ADR-006-pwa-online-first.md)
- [Arquitectura Frontend](../frontend/README.md)
- [Estrategia de Estado](../state-management/README.md)
- [Angular PWA](https://angular.dev/guide/service-worker-intro)

---

_Estrategia PWA / Offline v1.0 — Documento vivo._
