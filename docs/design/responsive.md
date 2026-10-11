# Responsive Design

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir la estrategia responsive de la aplicación. Mobile-first con 3 breakpoints.

---

## Breakpoints

| Breakpoint | Min width | Dispositivo típico                |
| ---------- | --------- | --------------------------------- |
| (default)  | 0         | Móvil vertical                    |
| `sm:`      | 640px     | Móvil horizontal / tablet pequeña |
| `md:`      | 768px     | Tablet                            |
| `lg:`      | 1024px    | Desktop                           |

**Nota**: no hay `xl:` ni `2xl:`. La app no necesita más.

---

## Mobile-first

**Regla**: escribir los estilos móviles primero, luego agregar `sm:`, `md:`, `lg:` cuando haga falta.

**Ejemplo**:

```html
<!-- Mobile: 1 columna. Tablet: 2 columnas. Desktop: 3 columnas. -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">...</div>
```

**Razón**: la app se usa principalmente en móvil. Optimizar para móvil primero garantiza que se vea bien ahí.

---

## Layouts típicos

### Layout de página

**Mobile**: contenido full-width con padding.

```html
<main class="p-page md:p-page-md">
  <!-- contenido -->
</main>
```

**Desktop**: contenido centrado con max-width.

```html
<main class="p-page md:p-page-md max-w-4xl mx-auto">
  <!-- contenido -->
</main>
```

### Navegación

**Mobile**: bottom navigation bar con 4-5 items.

```html
<nav class="fixed bottom-0 inset-x-0 bg-surface border-t border-border pb-safe">
  <div class="flex justify-around">
    <!-- items -->
  </div>
</nav>
```

**Desktop**: sidebar lateral.

```html
<aside class="hidden lg:flex lg:flex-col w-64 border-r border-border">
  <!-- items -->
</aside>
```

**Decisión**: en mobile, bottom nav. En desktop, sidebar. La lógica de navegación es la misma, solo cambia el layout.

### Listado

**Mobile**: cards apiladas verticalmente.

```html
<div class="space-y-3">
  @for (item of items(); track item.id) {
  <app-card>...</app-card>
  }
</div>
```

**Desktop**: grid de cards.

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  @for (item of items(); track item.id) {
  <app-card>...</app-card>
  }
</div>
```

### Formulario

**Mobile**: campos full-width, apilados.

```html
<form class="space-y-4">
  <app-input label="Nombre" />
  <app-input label="Apellido" />
  <app-button type="submit" [fullWidth]="true">Guardar</app-button>
</form>
```

**Desktop**: campos en grid de 2 columnas, botón alineado a la derecha.

```html
<form class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <app-input label="Nombre" />
  <app-input label="Apellido" />
  <div class="md:col-span-2 flex justify-end">
    <app-button type="submit">Guardar</app-button>
  </div>
</form>
```

---

## Touch targets

**Regla**: todo elemento interactivo debe tener mínimo **44x44 px** en móvil.

**Aplicación**:

- Botones: `min-h-11` (44px) en móvil.
- Inputs: `h-11` (44px).
- Iconos clickeables: envolver en área de 44px.

**Ejemplo**:

```html
<button class="min-h-11 min-w-11 p-2">
  <lucide-icon name="x" />
</button>
```

---

## Safe areas (notch)

**Regla**: usar `env(safe-area-inset-*)` para respetar notch y home indicator en iPhone.

**Utilidades**:

```css
@layer utilities {
  .pt-safe {
    padding-top: env(safe-area-inset-top);
  }
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

**Uso**:

```html
<nav class="fixed bottom-0 pb-safe">...</nav>
```

---

## Tipografía responsive

**Regla**: ajustar el tamaño de títulos en móvil vs desktop.

| Contexto          | Mobile      | Desktop        |
| ----------------- | ----------- | -------------- |
| Título de página  | `text-xl`   | `md:text-2xl`  |
| Título de sección | `text-lg`   | `md:text-xl`   |
| Texto principal   | `text-base` | `md:text-base` |

**Ejemplo**:

```html
<h1 class="text-xl md:text-2xl font-bold">Órdenes de trabajo</h1>
```

---

## Imágenes responsive

**Regla**: usar `loading="lazy"` y `decoding="async"` en todas las imágenes.

```html
<img [src]="photoUrl()" loading="lazy" decoding="async" class="w-full h-auto rounded-md" />
```

**Razón**: mejora performance en móvil.

---

## Orientación

**Regla**: la app se usa en **portrait** (vertical). No se optimiza para landscape.

**Razón**: el manifest define `orientation: portrait`. Los formularios y listados están diseñados para vertical.

**Excepción**: la galería de fotos puede verse mejor en landscape, pero no se optimiza.

---

## Referencias

- [README de design](./README.md)
- [Decisiones transversales](./decisions.md)
- [Tailwind responsive](https://tailwindcss.com/docs/responsive-design)

---

_Responsive Design v1.0_
