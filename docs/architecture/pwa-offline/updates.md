# Actualización de la App

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir cómo se detectan y aplican las actualizaciones de la PWA.

---

## `UpdateService`

Ubicación: `core/pwa/update.service.ts`.

```typescript
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly toast = inject(ToastService);

  init() {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.toast.showUpdate('Hay una actualización disponible', () => {
          this.swUpdate.activateUpdate().then(() => location.reload());
        });
      }
    });

    // Check cada 6 horas
    setInterval(() => this.swUpdate.checkForUpdate(), 6 * 60 * 60 * 1000);
  }
}
```

---

## Flujo

```
1. Usuario abre la app
   ↓
2. Service worker se activa
   ↓
3. Service worker detecta nueva versión (ngsw.json cambió)
   ↓
4. Evento VERSION_READY se emite
   ↓
5. UpdateService muestra toast: "Hay una actualización disponible. [Recargar]"
   ↓
6. Usuario toca "Recargar"
   ↓
7. Service worker activa la nueva versión
   ↓
8. App recarga
```

---

## Toasts de actualización

El `ToastService` incluye un método específico para actualizaciones:

```typescript
@Injectable({ providedIn: 'root' })
export class ToastService {
  showUpdate(message: string, onReload: () => void) {
    this.toast.info(message, {
      action: { label: 'Recargar', callback: onReload },
      duration: 0, // no auto-dismiss
    });
  }
}
```

**Comportamiento**:

- El toast no se auto-cierra.
- Tiene un botón "Recargar".
- El usuario puede ignorarlo y seguir trabajando.
- El toast persiste hasta que el usuario actúe o cierre la app.

---

## Estrategia de actualización

**No forzar la recarga**: el usuario decide cuándo recargar. Esto evita perder trabajo en progreso.

**Verificación periódica**: cada 6 horas se verifica si hay nueva versión. Esto se ejecuta solo si el service worker está habilitado.

**Sin actualización silenciosa**: no se aplica la actualización sin avisar al usuario. El toast es obligatorio.

---

## Manejo de errores

Si `activateUpdate()` falla:

```typescript
this.swUpdate
  .activateUpdate()
  .then(() => location.reload())
  .catch((error) => {
    console.error('Error activating update:', error);
    this.toast.error('No se pudo actualizar. Recarga manualmente.');
  });
```

---

## Verificación manual

El usuario puede verificar manualmente desde configuración:

```typescript
checkForUpdates() {
  this.swUpdate.checkForUpdate().then(hasUpdate => {
    if (!hasUpdate) {
      this.toast.info('La app está actualizada');
    }
  });
}
```

---

## Referencias

- [README de pwa-offline](./README.md)
- [Decisiones transversales](./decisions.md)
- [Service Worker](./service-worker.md)
- [Angular SwUpdate](https://angular.dev/api/service-worker/SwUpdate)

---

_Actualización de la App v1.0_
