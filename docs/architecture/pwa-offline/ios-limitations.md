# Limitaciones de iOS

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Documentar las limitaciones de PWA en iOS y las mitigaciones.

---

## Contexto

- **3 de 4 usuarios** del taller usan Android.
- iOS es secundario pero **posible en otros talleres**.
- Las PWA en iOS tienen limitaciones significativas comparadas con Android.

---

## Limitaciones

### 1. Sin `beforeinstallprompt`

**Impacto**: no se puede mostrar un banner de instalación nativo.

**Mitigación**: mostrar instrucciones manuales en el login para usuarios de iOS.

**Referencia**: ver [`install.md`](./install.md).

### 2. Storage puede limpiarse

**Impacto**: `localStorage` puede borrarse si el dispositivo tiene poco espacio o si el usuario limpia datos de Safari.

**Mitigación**:

- No persistir datos críticos solo en `localStorage`.
- Los borradores son efímeros (se pierden si se borran).
- La sesión se restaura desde Supabase (no solo desde `localStorage`).

### 3. Push notifications limitadas

**Impacto**: iOS 16.4+ soporta push en PWA, pero solo si la app está instalada y el usuario otorga permiso. No es confiable.

**Mitigación**:

- No se implementa push en MVP.
- El taller notifica al cliente por WhatsApp/llamada.
- Fase 2: evaluar si el taller lo pide.

### 4. Sin background sync

**Impacto**: no se puede sincronizar en background cuando vuelve la conexión.

**Mitigación**: no aplica. La estrategia es online-first (no offline-first).

### 5. Cache limitado

**Impacto**: iOS limita el storage de las PWA. El service worker puede perder caché.

**Mitigación**: el service worker re-descarga automáticamente si detecta que la caché no está.

### 6. Sin acceso a cámara en algunos contextos

**Impacto**: en versiones antiguas de iOS, la cámara no estaba disponible en PWA. En iOS 14.3+ sí funciona.

**Mitigación**: no aplica para iOS 14.3+. Se documenta para usuarios con iOS antiguo.

### 7. Sin `Web Share API` completo

**Impacto**: compartir archivos (PDFs) puede no funcionar en iOS.

**Mitigación**: usar descarga directa en lugar de compartir.

### 8. Sin `Badging API`

**Impacto**: no se puede mostrar un badge en el icono de la app.

**Mitigación**: no aplica. No se usan badges.

---

## Matriz resumen

| Limitación                 | Impacto | Mitigación                 |
| -------------------------- | ------- | -------------------------- |
| Sin `beforeinstallprompt`  | Medio   | Instrucciones manuales     |
| Storage puede limpiarse    | Bajo    | Datos críticos en servidor |
| Push limitadas             | Bajo    | WhatsApp/llamada           |
| Sin background sync        | Nulo    | Online-first               |
| Cache limitado             | Bajo    | Re-descarga automática     |
| Cámara en iOS antiguo      | Bajo    | Requiere iOS 14.3+         |
| `Web Share API` incompleto | Bajo    | Descarga directa           |
| Sin `Badging API`          | Nulo    | No se usan badges          |

---

## Decisión

**No se optimiza para iOS en MVP.** Se documentan las limitaciones y se mitigan las críticas. Si en Fase 2 un taller con iOS lo pide, se evalúa:

- Convertir la PWA en app nativa con Capacitor.
- O usar push notifications en iOS 16.4+.

---

## Referencias

- [README de pwa-offline](./README.md)
- [Decisiones transversales](./decisions.md)
- [Instalación](./install.md)

---

_Limitaciones de iOS v1.0_
