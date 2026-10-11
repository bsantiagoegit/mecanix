# Design Tokens

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Definir los design tokens: colores, tipografía, espaciado, radios y sombras.

**Formato**: CSS custom properties (variables CSS) definidas en `src/styles.css` dentro de un bloque `@theme` (Tailwind v4).

---

## Colores

### Paleta funcional

6 familias semánticas. Cada una con los tonos que se usan.

#### Primary (blue)

Acciones principales, links, focus.

```css
--color-primary-50: #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-200: #bfdbfe;
--color-primary-300: #93c5fd;
--color-primary-400: #60a5fa;
--color-primary-500: #3b82f6; /* default */
--color-primary-600: #2563eb; /* hover */
--color-primary-700: #1d4ed8; /* active */
--color-primary-800: #1e40af;
--color-primary-900: #1e3a8a;
--color-primary-950: #172554;
```

#### Neutral (slate)

Fondos, bordes, texto.

```css
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
```

#### Success (green)

Confirmaciones, estados completados.

```css
--color-success-50: #f0fdf4;
--color-success-100: #dcfce7;
--color-success-500: #22c55e;
--color-success-600: #16a34a;
--color-success-700: #15803d;
--color-success-900: #14532d;
```

#### Warning (amber)

Advertencias, atención.

```css
--color-warning-50: #fffbeb;
--color-warning-100: #fef3c7;
--color-warning-500: #f59e0b;
--color-warning-600: #d97706;
--color-warning-700: #b45309;
--color-warning-900: #78350f;
```

#### Danger (red)

Errores, acciones destructivas.

```css--color-danger-50: #fef2f2;
--color-danger-100: #fee2e2;
--color-danger-500: #ef4444;
--color-danger-600: #dc2626;
--color-danger-700: #b91c1c;
--color-danger-900: #7f1d1d;
```

#### Info (sky)

Información neutral, ayuda.

```css
--color-info-50: #f0f9ff;
--color-info-100: #e0f2fe;
--color-info-500: #0ea5e9;
--color-info-600: #0284c7;
--color-info-700: #0369a1;
--color-info-900: #0c4a6e;
```

### Colores semánticos

Alias que apuntan a la paleta. Permiten cambiar el tema sin tocar componentes.

```css
/* Light mode (default) */
:root {
  --color-bg: var(--color-neutral-50); /* fondo de página */
  --color-surface: #ffffff; /* fondo de cards, modales */
  --color-border: var(--color-neutral-200); /* bordes */
  --color-fg: var(--color-neutral-900); /* texto principal */
  --color-fg-muted: var(--color-neutral-500); /* texto secundario */
}

/* Dark mode (override) */
[data-theme='dark'] {
  --color-bg: var(--color-neutral-950); /* fondo muy oscuro */
  --color-surface: var(--color-neutral-900); /* cards, modales */
  --color-border: var(--color-neutral-800); /* bordes */
  --color-fg: var(--color-neutral-50); /* texto principal */
  --color-fg-muted: var(--color-neutral-400); /* texto secundario */
}
```

**Uso**: `bg-bg`, `bg-surface`, `border-border`, `text-fg`, `text-fg-muted`.

---

## Tipografía

### Fuentes

```css
--font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
```

**Carga**: Inter se carga desde Google Fonts o self-hosted. Self-hosted recomendado para PWA.

### Tamaños

```css
--text-xs: 0.75rem; /* 12px / 1rem line-height */
--text-sm: 0.875rem; /* 14px / 1.25rem */
--text-base: 1rem; /* 16px / 1.5rem */
--text-lg: 1.125rem; /* 18px / 1.75rem */
--text-xl: 1.25rem; /* 20px / 1.75rem */
--text-2xl: 1.5rem; /* 24px / 2rem */
```

**Uso por contexto**:

| Contexto          | Tamaño                  |
| ----------------- | ----------------------- |
| Título de página  | `text-2xl font-bold`    |
| Título de sección | `text-xl font-semibold` |
| Subtítulo         | `text-lg font-medium`   |
| Texto principal   | `text-base`             |
| Texto secundario  | `text-sm text-fg-muted` |
| Metadatos, labels | `text-xs text-fg-muted` |

### Pesos

```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## Espaciado

Tailwind ya tiene la escala (`p-1`, `p-2`, `p-4`, etc.). No se redefine.

**Adicional**: tokens semánticos para layouts.

```css
--spacing-page: 1rem; /* padding de página en móvil */
--spacing-page-md: 1.5rem; /* padding de página en tablet+ */
--spacing-section: 1.5rem; /* entre secciones */
--spacing-card: 1rem; /* padding interno de cards */
```

**Uso**: `p-page`, `p-page-md`, `gap-section`, `p-card`.

**Escala estándar de Tailwind** (referencia):

| Token | Tamaño         | Uso           |
| ----- | -------------- | ------------- |
| `0`   | 0              | Sin espacio   |
| `1`   | 0.25rem (4px)  | Micro         |
| `2`   | 0.5rem (8px)   | Pequeño       |
| `3`   | 0.75rem (12px) | Medio-pequeño |
| `4`   | 1rem (16px)    | Base          |
| `6`   | 1.5rem (24px)  | Medio         |
| `8`   | 2rem (32px)    | Grande        |
| `12`  | 3rem (48px)    | Extra grande  |

---

## Radios

```css
--radius-sm: 0.25rem; /* 4px */
--radius-md: 0.5rem; /* 8px */
--radius-lg: 0.75rem; /* 12px */
--radius-xl: 1rem; /* 16px */
--radius-full: 9999px;
```

**Uso**:

- `rounded-sm`: badges pequeños.
- `rounded-md`: inputs, buttons.
- `rounded-lg`: cards.
- `rounded-xl`: modales.
- `rounded-full`: avatares, iconos circulares.

---

## Sombras

```css
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
```

**Uso**:

- `shadow-xs`: borders sutiles.
- `shadow-sm`: cards.
- `shadow-md`: dropdowns.
- `shadow-lg`: modales.

---

## Breakpoints

Tailwind por defecto:

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
```

No se redefine.

---

## Uso en Angular

Los tokens se definen en `src/styles.css`:

```css
@import 'tailwindcss';

@theme {
  /* colores */
  --color-primary-500: #3b82f6;
  /* ... */
}

/* Estilos globales */
body {
  @apply bg-bg text-fg font-sans;
}
```

Y se usan directamente en las clases de Tailwind:

```html
<button class="bg-primary-500 text-white rounded-md">Guardar</button>
```

---

## Dark mode

Los tokens de color cambian según el tema aplicado en `<html data-theme="...">`.

**Estrategia**: `class` con atributo `data-theme`. Ver [D-DS-16](./decisions.md).

**Tokens que cambian**:

- `--color-bg`
- `--color-surface`
- `--color-border`
- `--color-fg`
- `--color-fg-muted`

**Tokens que NO cambian**:

- Paleta funcional (`primary-*`, `neutral-*`, `success-*`, etc.). Los colores base son los mismos en ambos temas.
- Tipografía.
- Espaciado.
- Radios.
- Sombras.

**Razón**: los colores semánticos (bg, surface, fg, etc.) son los que cambian. Los componentes usan esos tokens y, por lo tanto, se adaptan solos.

**Ajuste de opacidad de sombras**: en dark mode, las sombras son menos visibles. Se recomienda usar `ring-1 ring-white/10` en cards en dark mode en lugar de `shadow-sm`.

**Ejemplo de componente**:

```html
<div class="bg-surface text-fg border border-border rounded-lg p-card">
  <h3 class="text-lg font-semibold text-fg">Título</h3>
  <p class="text-sm text-fg-muted">Descripción</p>
</div>
```

---

## Referencias

- [README de design](./README.md)
- [Decisiones transversales](./decisions.md)
- [Tailwind config](./tailwind-config.md)
- [Convenciones](./conventions.md)

---

_Design Tokens v1.1_
