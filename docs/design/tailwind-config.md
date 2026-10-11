# Configuración de Tailwind

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir la configuración de Tailwind CSS v4 en el proyecto Angular.

---

## Instalación

```bash
pnpm install -D tailwindcss @tailwindcss/postcss postcss
```

**Nota**: Tailwind v4 usa un plugin de PostCSS. No usa `tailwind.config.js` como v3.

---

## `src/styles.css`

Archivo principal de estilos.

```css
@import 'tailwindcss';
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@theme {
  /* ===== Colores ===== */
  /* Primary (blue) */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;
  --color-primary-950: #172554;

  /* Neutral (slate) */
  --color-neutral-50: #f8fafc;
  --color-neutral-100: #f1f5f9;
  --color-neutral-200: #e2e8f0;
  --color-neutral-300: #cbd5e1;
  --color-neutral-400: #94a3b8;
  --color-neutral-500: #64748b;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1e293b;
  --color-neutral-900: #0f172a;
  --color-neutral-950: #020617;

  /* Success, Warning, Danger, Info */
  --color-success-50: #f0fdf4;
  --color-success-100: #dcfce7;
  --color-success-500: #22c55e;
  --color-success-600: #16a34a;
  --color-success-700: #15803d;
  --color-success-900: #14532d;

  --color-warning-50: #fffbeb;
  --color-warning-100: #fef3c7;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;
  --color-warning-700: #b45309;
  --color-warning-900: #78350f;

  --color-danger-50: #fef2f2;
  --color-danger-100: #fee2e2;
  --color-danger-500: #ef4444;
  --color-danger-600: #dc2626;
  --color-danger-700: #b91c1c;
  --color-danger-900: #7f1d1d;

  --color-info-50: #f0f9ff;
  --color-info-100: #e0f2fe;
  --color-info-500: #0ea5e9;
  --color-info-600: #0284c7;
  --color-info-700: #0369a1;
  --color-info-900: #0c4a6e;

  /* Semánticos (light) */
  --color-bg: var(--color-neutral-50);
  --color-surface: #ffffff;
  --color-border: var(--color-neutral-200);
  --color-fg: var(--color-neutral-900);
  --color-fg-muted: var(--color-neutral-500);

  /* ===== Tipografía ===== */
  --font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;

  /* ===== Espaciado semántico ===== */
  --spacing-page: 1rem;
  --spacing-page-md: 1.5rem;
  --spacing-section: 1.5rem;
  --spacing-card: 1rem;

  /* ===== Radios ===== */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* ===== Sombras ===== */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

/* ===== Dark mode ===== */
[data-theme='dark'] {
  --color-bg: var(--color-neutral-950);
  --color-surface: var(--color-neutral-900);
  --color-border: var(--color-neutral-800);
  --color-fg: var(--color-neutral-50);
  --color-fg-muted: var(--color-neutral-400);
}

/* ===== Estilos globales ===== */
@layer base {
  html {
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color-scheme: light dark;
  }

  [data-theme='light'] {
    color-scheme: light;
  }

  [data-theme='dark'] {
    color-scheme: dark;
  }

  body {
    @apply bg-bg text-fg;
    margin: 0;
    min-height: 100vh;
  }

  /* Focus visible global */
  *:focus-visible {
    @apply outline-none ring-2 ring-primary-500 ring-offset-2;
  }

  /* Scrollbar delgado en desktop */
  @media (min-width: 1024px) {
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-thumb {
      @apply bg-neutral-300 rounded-full;
    }
    ::-webkit-scrollbar-thumb:hover {
      @apply bg-neutral-400;
    }
  }
}

/* ===== Utilidades personalizadas ===== */
@layer utilities {
  /* Safe area para móviles con notch */
  .pt-safe {
    padding-top: env(safe-area-inset-top);
  }
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

---

## `.postcssrc.json`

Configuración de PostCSS para Angular.

```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

---

## `angular.json`

Asegurar que `styles.css` esté en los estilos del proyecto:

```json
{
  "projects": {
    "taller-os-web": {
      "architect": {
        "build": {
          "options": {
            "styles": ["src/styles.css"]
          }
        }
      }
    }
  }
}
```

**Nota**: Angular 21 ya incluye `src/styles.css` por defecto. No hay que agregarlo manualmente.

---

## Carga de Inter

### Opción A: Google Fonts (simple)

Agregar en `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

**Desventaja**: dependencia de Google Fonts. Si Google falla, la fuente no carga.

### Opción B: Self-hosted (recomendado para PWA)

Descargar Inter y colocarla en `public/fonts/`:

```
public/fonts/
├── Inter-Regular.woff2
├── Inter-Medium.woff2
├── Inter-SemiBold.woff2
└── Inter-Bold.woff2
```

Definir en `styles.css`:

```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/Inter-Medium.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/Inter-SemiBold.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/Inter-Bold.woff2') format('woff2');
}
```

**Razón**: PWA debe funcionar offline. Self-hosting garantiza disponibilidad.

**Decisión**: usar self-hosted.

---

## Verificación

Después de configurar:

1. Ejecutar `ng serve`.
2. Abrir la app en el navegador.
3. Verificar en DevTools que las clases Tailwind se aplican.
4. Verificar que Inter se carga (DevTools → Network → fuentes).
5. Probar un cambio de color (ej: `bg-primary-500`) y ver que se aplica.

---

## Referencias

- [README de design](./README.md)
- [Decisiones transversales](./decisions.md)
- [Tokens](./tokens.md)
- [Tailwind v4 docs](https://tailwindcss.com/docs/v4-beta)

---

_Configuración de Tailwind v1.0_
