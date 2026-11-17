# ADR-015: Iconos con Lucide (`@lucide/angular`) detrás de `app-icon`

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-11
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

La decisión de diseño [D-DS-09](../../design/decisions.md) fijó **Lucide** como librería de iconos, pero nunca se instaló: los iconos que existen (spinner, ojo de contraseña, flecha del desplegable, marca ✓, X del modal, "i" del tooltip) son SVG escritos a mano dentro de seis componentes compartidos. Cada icono nuevo implicaba copiar y pegar un SVG, y la documentación ya mostraba ejemplos con `<lucide-icon>`. Las siguientes pantallas (detalle de cliente, vehículos, órdenes) van a necesitar muchos más.

Por la regla de `CLAUDE.md`, añadir una dependencia exige un ADR.

---

## Decisión

Usar **`@lucide/angular`** y exponerlo a la app solo a través de un componente propio, **`app-icon`**.

- **Paquete**: `@lucide/angular` (ISC, sin dependencias, pensado para Angular con signals y sin zone). **No** `lucide-angular`: ese paquete está deprecado en npm y su sustituto oficial es `@lucide/angular`.
- **Registro único** (`shared/components/icon/icons.ts`): un objeto `APP_ICONS` con los iconos que se usan, por nombre en kebab-case (`'chevron-down'`). Es el **único** archivo que importa de Lucide.
- **`app-icon`**: `<app-icon name="check" />`, con `size` (px, default 16), `strokeWidth` y `title`. `name` es un tipo (`AppIconName`) derivado del registro, así que un nombre inexistente no compila. Hereda el color del texto (`currentColor`).
- **Accesibilidad**: decorativo por defecto (`aria-hidden`); el botón o enlace que lo contiene lleva el nombre accesible. Con `title`, el icono se anuncia por sí mismo.
- **Sin SVG en las pantallas**: las features usan `app-icon`, nunca un `<svg>` pegado.
- **Para añadir un icono**: importarlo y registrarlo en `icons.ts`.

---

## Alternativas consideradas

### Alternativa A: Seguir con SVG escritos a mano

- **Ventajas**: cero dependencias.
- **Desventajas**: cada icono se copia y se mantiene a mano; estilo inconsistente (grosores, tamaños); la documentación de diseño ya prometía Lucide.
- **Razón de descarte**: no escala con las pantallas que vienen.

### Alternativa B: `lucide-angular` (paquete anterior)

- **Desventajas**: está deprecado y apunta a `@lucide/angular`.
- **Razón de descarte**: nacer con un paquete obsoleto.

### Alternativa C: Usar los componentes de Lucide directamente en cada plantilla

- **Descripción**: `<svg lucideEye>` donde haga falta.
- **Desventajas**: cada componente importa su icono; la app queda acoplada a la librería; no hay un tipo con los nombres válidos.
- **Razón de descarte**: `app-icon` da un solo punto de cambio y nombres validados.

### Alternativa D: Font Awesome

- **Razón de descarte**: ya descartada en D-DS-09 (peso, tree-shaking manual, estilo).

---

## Consecuencias

### Positivas

- Estilo consistente (misma familia, grosor y rejilla) y un solo lugar donde se decide qué iconos hay.
- Se empaquetan solo los iconos registrados: el bundle inicial pasó de 576,31 kB a 576,73 kB (+0,4 kB) al migrar los 8 iconos existentes.
- Cambiar de librería en el futuro toca `icon/` y no las pantallas.

### Negativas

- Una dependencia más que mantener al día.
- Cada icono nuevo exige registrarlo en `icons.ts` (es a propósito: evita empaquetar los ~1.700 de la librería).

### Neutras

- La licencia es ISC (no MIT como decía D-DS-09); es igual de permisiva.
