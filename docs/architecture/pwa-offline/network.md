# Detección de Conexión

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir cómo se detecta el estado de conexión y cómo se comunica al usuario.

---

## `NetworkService`

Ubicación: `core/network/network.service.ts`.

```typescript
@Injectable({ providedIn: 'root' })
export class NetworkService {
  readonly isOnline = signal(navigator.onLine);

  constructor() {
    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));
  }
}
```

---

## `OfflineBannerComponent`

Ubicación: `shared/components/offline-banner/offline-banner.component.ts`.

```typescript
@Component({
  selector: 'app-offline-banner',
  template: `
    @if (!network.isOnline()) {
      <div class="fixed top-0 inset-x-0 bg-amber-500 text-white text-sm py-2 px-4 text-center z-50">
        Sin conexión — los cambios no se guardarán
      </div>
    }
  `,
})
export class OfflineBannerComponent {
  readonly network = inject(NetworkService);
}
```

---

## Uso en `AppShellComponent`

```typescript
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, OfflineBannerComponent, ToastContainerComponent],
  template: `
    <app-offline-banner />
    <router-outlet />
    <app-toast-container />
  `,
})
export class AppShellComponent {}
```

---

## Uso en formularios

Antes de enviar una operación, verificar si está online:

```typescript
async onSubmit() {
  if (!this.network.isOnline()) {
    this.toast.error('Sin conexión. Reintenta cuando vuelvas online.');
    return;
  }
  // ... continuar
}
```

---

## Limitaciones de `navigator.onLine`

**Limitación**: `navigator.onLine` solo detecta si el dispositivo tiene conexión de red, no si Internet funciona.

**Ejemplo**: el dispositivo está conectado a WiFi, pero el router no tiene Internet. `navigator.onLine` devuelve `true`, pero las peticiones a Supabase fallan.

**Mitigación**:

- Si una operación falla por red (error de fetch, timeout), el data service lanza `DataError`.
- El contenedor captura el error y muestra un mensaje al usuario.
- Opcionalmente, se puede marcar como offline manualmente si múltiples operaciones fallan.

**Decisión**: no se implementa detección proactiva de Internet en MVP. Se confía en `navigator.onLine` y en el manejo de errores.

---

## Referencias

- [README de pwa-offline](./README.md)
- [Decisiones transversales](./decisions.md)
- [Manejo de errores](../frontend/error-handling.md)

---

_Detección de Conexión v1.0_
