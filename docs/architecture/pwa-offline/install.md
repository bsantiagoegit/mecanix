# Instalación en Móvil

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir cómo se instala la PWA en dispositivos móviles (Android e iOS).

---

## `InstallService`

Ubicación: `core/pwa/install.service.ts`.

```typescript
@Injectable({ providedIn: 'root' })
export class InstallService {
  private deferredPrompt: any = null;
  readonly canInstall = signal(false);

  constructor() {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
    });
  }

  async promptInstall(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.canInstall.set(false);
    }
    this.deferredPrompt = null;
  }
}
```

---

## Botón de instalación

Ubicación: pantalla de login o menú de configuración.

```typescript
@Component({
  selector: 'app-install-button',
  template: `
    @if (install.canInstall()) {
      <button type="button" (click)="install.promptInstall()" class="btn btn-secondary">
        Instalar app
      </button>
    }
  `,
})
export class InstallButtonComponent {
  readonly install = inject(InstallService);
}
```

**Ubicaciones**:

- Login page: para que el usuario instale al primer uso.
- Menú de configuración: para instalación posterior.

---

## Instalación en Android

1. Abrir la app en Chrome.
2. Aparece el banner "Añadir a pantalla de inicio" (o el botón "Instalar app").
3. Tocar "Instalar".
4. La app aparece en el home screen.

**Alternativa manual**:

1. Menú de Chrome (⋮).
2. "Instalar aplicación" o "Añadir a pantalla de inicio".

---

## Instalación en iOS

**iOS no soporta `beforeinstallprompt`**. El usuario debe instalar manualmente:

1. Abrir la app en Safari (no Chrome).
2. Tocar el botón "Compartir" (cuadrado con flecha).
3. Desplazarse y tocar "Añadir a pantalla de inicio".
4. Confirmar el nombre.
5. La app aparece en el home screen.

**Mitigación**: mostrar instrucciones en el login para usuarios de iOS.

```typescript
@Component({
  selector: 'app-ios-install-hint',
  template: `
    @if (isIos() && !isStandalone()) {
      <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
        <p class="font-medium">Para instalar en iPhone:</p>
        <ol class="list-decimal list-inside mt-1">
          <li>Toca el botón Compartir en Safari</li>
          <li>Selecciona "Añadir a pantalla de inicio"</li>
        </ol>
      </div>
    }
  `,
})
export class IosInstallHintComponent {
  readonly isIos = signal(/iPad|iPhone|iPod/.test(navigator.userAgent));
  readonly isStandalone = signal(window.matchMedia('(display-mode: standalone)').matches);
}
```

---

## Detección de modo standalone

```typescript
readonly isStandalone = signal(
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true
);
```

**Uso**: si la app ya está instalada, no mostrar el botón de instalación.

---

## Criterios de instalación

La PWA se puede instalar si cumple:

- El manifest tiene `name`, `short_name`, `icons` (192 y 512), `start_url`, `display`.
- El service worker está registrado.
- La app se sirve por HTTPS.
- El usuario ha visitado la app al menos una vez.

---

## Referencias

- [README de pwa-offline](./README.md)
- [Decisiones transversales](./decisions.md)
- [Manifest](./manifest.md)
- [iOS Limitations](./ios-limitations.md)

---

_Instalación en Móvil v1.0_
