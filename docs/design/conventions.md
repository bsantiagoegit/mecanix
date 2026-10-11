# Convenciones de Clases Tailwind

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir convenciones para usar Tailwind de forma consistente y mantenible. Evitar la "sopa de clases".

---

## Reglas

### Regla 1: Orden consistente

Al escribir clases, seguir este orden:

1. **Layout**: `flex`, `grid`, `block`, `hidden`.
2. **Position**: `relative`, `absolute`, `fixed`, `sticky`.
3. **Spacing**: `p-*`, `m-*`, `gap-*`.
4. **Sizing**: `w-*`, `h-*`, `min-w-*`, `max-w-*`.
5. **Colors**: `bg-*`, `text-*`, `border-*`.
6. **Typography**: `text-*` (size), `font-*`, `leading-*`.
7. **Effects**: `shadow-*`, `opacity-*`, `rounded-*`.
8. **States**: `hover:*`, `focus:*`, `active:*`, `disabled:*`.

**Ejemplo**:

```html
<button
  class="flex items-center justify-center px-4 py-2 rounded-md bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 focus:ring-2 disabled:opacity-50"
></button>
```

---

### Regla 2: Sin valores arbitrarios

Usar los tokens definidos. No usar `bg-[#3b82f6]` ni `p-[13px]`.

**Excepción**: casos justificados (ej: `min-h-[44px]` para touch target).

---

### Regla 3: Extraer a componente cuando se repite 3+ veces

Si las mismas clases se repiten 3 o más veces, extraer a un componente en `shared/components/`.

**Mal**:

```html
<button class="px-4 py-2 rounded-md bg-primary-500 text-white text-sm font-medium">Guardar</button>
<button class="px-4 py-2 rounded-md bg-primary-500 text-white text-sm font-medium">Cancelar</button>
<button class="px-4 py-2 rounded-md bg-primary-500 text-white text-sm font-medium">Eliminar</button>
```

**Bien**:

```html
<app-button>Guardar</app-button>
<app-button>Cancelar</app-button>
<app-button>Eliminar</app-button>
```

---

### Regla 4: Sin `@apply` en features

Los componentes de features usan clases directas en el template. `@apply` solo se usa en componentes base de `shared/`.

**Razón**: `@apply` oculta las clases y complica el debugging.

**Excepción**: en `styles.css` para estilos globales (body, focus, scrollbar).

---

### Regla 5: `cn()` para clases condicionales

**Mal**:

```typescript
const buttonClass =
  this.variant() === 'primary'
    ? 'bg-primary-500 text-white hover:bg-primary-600'
    : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200';
```

**Bien**:

```typescript
const buttonClass = computed(() =>
  cn(
    'px-4 py-2 rounded-md text-sm font-medium',
    this.variant() === 'primary'
      ? 'bg-primary-500 text-white hover:bg-primary-600'
      : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
  ),
);
```

**Ventaja**: `cn()` resuelve conflictos (`p-2 p-4` → `p-4`).

---

### Regla 6: Usar tokens semánticos

Preferir tokens semánticos sobre colores directos.

**Mal**:

```html
<div class="bg-white text-neutral-900 border-neutral-200"></div>
```

**Bien**:

```html
<div class="bg-surface text-fg border-border"></div>
```

**Razón**: si se cambia el tema, solo se cambian los tokens.

---

### Regla 7: Mobile-first, agregar breakpoints

Escribir estilos móviles primero, agregar `sm:`, `md:`, `lg:` cuando haga falta.

**Mal**:

```html
<div class="lg:grid-cols-3 sm:grid-cols-2 grid-cols-1"></div>
```

**Bien**:

```html
<div class="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"></div>
```

---

### Regla 8: Sin `!important`

No usar `!` en clases Tailwind. Si se necesita sobreescribir, hay un problema de especificidad que debe resolverse de otra forma.

**Excepción**: casos muy justificados, con comentario explicando por qué.

---

### Regla 9: Agrupar estados con `group`

Cuando varios elementos reaccionan al hover de un contenedor, usar `group`.

**Ejemplo**:

```html
<div class="group hover:bg-neutral-100">
  <h3 class="group-hover:text-primary-600">Título</h3>
  <p class="group-hover:text-neutral-700">Descripción</p>
</div>
```

---

### Regla 10: Sin clases dinámicas construidas con strings

**Mal**:

```html
<div class="bg-{{ color }}-500"></div>
```

**Razón**: Tailwind no detecta clases dinámicas en build time. No se incluyen en el CSS final.

**Bien**:

```typescript
const colorClass = computed(
  () =>
    ({
      primary: 'bg-primary-500',
      success: 'bg-success-500',
      danger: 'bg-danger-500',
    })[this.color()],
);
```

---

### Regla 11: Preferir tokens semánticos sobre `dark:`

Cuando los tokens semánticos (`bg-surface`, `text-fg`, etc.) cambian solos con el tema, **no se necesita `dark:`**.

**Mal**:

```html
<div class="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50"></div>
```

**Bien**

```html
<div class="bg-surface text-fg"></div>
```

**Razón:** bg-surface y text-fg cambian automáticamente con el tema. Menos clases, menos redundancia.

**Cuándo usar dark::** solo cuando un elemento necesita un color específico que no está cubierto por los tokens semánticos.

**Ejemplo**

```html
<!-- El texto muted cambia con los tokens, pero el borde necesita un ajuste específico -->
<div class="text-fg-muted dark:border-neutral-800 border-neutral-200"></div>
```

---

### Regla 12: No hardcodear colores de la paleta funcional en dark mode

Los colores de la paleta funcional (primary-_, success-_, etc.) son los mismos en light y dark. No se duplican en dark mode.

**Mal**

```html
<button class="bg-primary-500 dark:bg-primary-400"></button>
```

**bien**

```html
<button class="bg-primary-500"></button>
```

**Razon:** `primary-500` se ve bien en ambos temas. Si no, se ajusta el token, no cada componente.

---

## Ejemplos completos

### Ejemplo 1: Botón

```html
<button
  type="button"
  class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary-500 text-white text-sm font-medium transition-colors duration-150 hover:bg-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <lucide-icon name="save" size="16" />
  Guardar
</button>
```

### Ejemplo 2: Card

```html
<article class="p-card rounded-lg bg-surface border border-border shadow-sm">
  <h3 class="text-lg font-semibold text-fg">Título</h3>
  <p class="mt-2 text-sm text-fg-muted">Descripción</p>
</article>
```

### Ejemplo 3: Input

```html
<div class="flex flex-col gap-1">
  <label for="name" class="text-sm font-medium text-fg">Nombre</label>
  <input
    id="name"
    type="text"
    class="h-11 px-3 rounded-md border border-border bg-surface text-base text-fg placeholder:text-fg-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
  />
</div>
```

### Ejemplo 4: Badge

```html
<span
  class="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-success-100 text-success-700"
>
  Completada
</span>
```

---

## Referencias

- [README de design](./README.md)
- [Decisiones transversales](./decisions.md)
- [Tokens](./tokens.md)
- [Tailwind best practices](https://tailwindcss.com/docs/reusing-styles)

---

_Convenciones de Clases Tailwind v1.0_
