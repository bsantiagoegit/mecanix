# Web App Manifest

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Definir el Web App Manifest y los iconos necesarios para la instalación de la PWA.

---

## `manifest.webmanifest`

Ubicación: `public/manifest.webmanifest`.

```json
{
  "name": "TallerOS — Gestión de Taller Mecánico",
  "short_name": "TallerOS",
  "description": "Sistema de gestión para talleres mecánicos automotrices",
  "theme_color": "#0f172a",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "lang": "es-EC",
  "dir": "ltr",
  "categories": ["business", "productivity"],
  "icons": [
    {
      "src": "icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Nueva orden",
      "short_name": "Nueva orden",
      "url": "/work-orders/new",
      "icons": [
        {
          "src": "icons/shortcut-new-order.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    },
    {
      "name": "Órdenes abiertas",
      "short_name": "Órdenes",
      "url": "/work-orders",
      "icons": [
        {
          "src": "icons/shortcut-orders.png",
          "sizes": "96x96",
          "type": "image/png"
        }
      ]
    }
  ]
}
```

---

## Explicación de campos

| Campo              | Valor                                   | Razón                           |
| ------------------ | --------------------------------------- | ------------------------------- |
| `name`             | `TallerOS — Gestión de Taller Mecánico` | Nombre completo en stores       |
| `short_name`       | `TallerOS`                              | Nombre corto en home screen     |
| `description`      | Descripción                             | Para stores                     |
| `theme_color`      | `#0f172a` (slate-900)                   | Color de la barra del navegador |
| `background_color` | `#ffffff`                               | Color de fondo al instalar      |
| `display`          | `standalone`                            | Sin barra de navegador          |
| `orientation`      | `portrait`                              | Uso en móvil                    |
| `start_url`        | `/`                                     | Entrada principal               |
| `scope`            | `/`                                     | Toda la app                     |
| `lang`             | `es-EC`                                 | Español Ecuador                 |
| `dir`              | `ltr`                                   | Izquierda a derecha             |
| `categories`       | `["business", "productivity"]`          | Para stores                     |

---

## Iconos

### Tamaños requeridos

| Tamaño  | Uso                     | Archivo                |
| ------- | ----------------------- | ---------------------- |
| 72x72   | Android (low)           | `icon-72x72.png`       |
| 96x96   | Android (mid)           | `icon-96x96.png`       |
| 128x128 | Chrome Web Store        | `icon-128x128.png`     |
| 144x144 | Android (high)          | `icon-144x144.png`     |
| 152x152 | iPad                    | `icon-152x152.png`     |
| 180x180 | iPhone (apple-touch)    | `apple-touch-icon.png` |
| 192x192 | Android (home)          | `icon-192x192.png`     |
| 384x384 | Android (splash)        | `icon-384x384.png`     |
| 512x512 | Android (splash, store) | `icon-512x512.png`     |
| 512x512 | Android (maskable)      | `maskable-512x512.png` |

### Favicon

| Tamaño | Archivo             |
| ------ | ------------------- |
| 16x16  | `favicon-16x16.png` |
| 32x32  | `favicon-32x32.png` |
| ICO    | `favicon.ico`       |

### Splash screens (iOS)

iOS requiere splash screens por resolución. Se generan con `pwa-asset-generator`:

```bash
npx pwa-asset-generator ./logo.svg ./public/icons \
  --background "#0f172a" \
  --padding "20%" \
  --icon-only \
  --favicon \
  --manifest ./public/manifest.webmanifest \
  --splash-only
```

---

## `index.html`

Agregar en `<head>`:

```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#ffffff" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="TallerOS" />
```

---

## `theme-color` dinámico

El `<meta name="theme-color">` cambia según el tema aplicado.

**Valores**:

- Light: `#ffffff` (surface).
- Dark: `#020617` (neutral-950).

**Implementación**: se actualiza desde `ThemeService` cuando cambia el tema.

```typescript
private updateThemeColor(isDark: boolean) {
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', isDark ? '#020617' : '#ffffff');
}
```

**Razón:** el color de la barra del navegador se adapta al tema. Mejor experiencia visual.

**Limitación:** el manifest.webmanifest tiene un theme_color estático. El meta tag dinámico tiene prioridad sobre el manifest en la mayoría de navegadores. En iOS, el theme_color del manifest se usa solo al instalar.

---

## Verificación

Después del build:

1. **DevTools → Application → Manifest** debe mostrar el manifest con todos los iconos.
2. **DevTools → Application → Manifest → Install** debe estar disponible.
3. En Android, debe aparecer el prompt de instalación (si se cumplen los criterios).
4. En iOS, debe aparecer la opción "Añadir a pantalla de inicio" en Safari.

---

## Herramientas

- **`pwa-asset-generator`** — genera todos los iconos y splash screens desde un SVG maestro.
- **`maskable.app`** — verifica el icono maskable.

---

## Referencias

- [README de pwa-offline](./README.md)
- [Decisiones transversales](./decisions.md)
- [Instalación](./install.md)
- [Web App Manifest spec](https://www.w3.org/TR/appmanifest/)

---

_Web App Manifest v1.0_
