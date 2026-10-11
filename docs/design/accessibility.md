# Accesibilidad

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir los requisitos mínimos de accesibilidad del sistema.

---

## Requisitos

### 1. Contraste

**Regla**: cumplir con **WCAG AA**.

- Texto normal: contraste mínimo 4.5:1.
- Texto grande (>18px): contraste mínimo 3:1.
- Elementos de UI (bordes, iconos): contraste mínimo 3:1.

**Paleta**: los colores de la paleta funcional cumplen AA contra fondos blanco/neutral-50.

**Verificación**: usar [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) antes de aprobar cualquier combinación.

---

### 2. Focus visible

**Regla**: todo elemento interactivo debe tener un anillo de focus visible.

**Implementación**:

```css
*:focus-visible {
  @apply outline-none ring-2 ring-primary-500 ring-offset-2;
}
```

**Razón**:

- Usuarios de teclado necesitan saber dónde está el foco.
- `:focus-visible` (no `:focus`) evita el anillo en clicks de mouse.

---

### 3. Touch targets

**Regla**: todo elemento interactivo debe tener mínimo **44x44 px** en móvil.

**Implementación**:

- Botones: `min-h-11 min-w-11`.
- Inputs: `h-11`.
- Iconos clickeables: envolver en área de 44px.

**Razón**: WCAG 2.1 nivel AAA.

---

### 4. Labels

**Regla**: todo input debe tener un `<label>` asociado o `aria-label`.

**Bien**:

```html
<label for="name">Nombre</label> <input id="name" type="text" />
```

**Bien** (si no hay espacio para label visual):

```html
<input type="text" aria-label="Buscar" />
```

**Mal**:

```html
<input type="text" placeholder="Nombre" />
```

**Razón**: los placeholders no son labels. Desaparecen al escribir.

---

### 5. Roles y aria

**Regla**: usar HTML semántico primero. Agregar roles solo cuando el HTML nativo no alcanza.

**Ejemplos**:

- Botón: `<button>` (no `<div role="button">`).
- Link: `<a href="...">` (no `<div role="link">`).
- Modal: `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
- Toast: `role="status"` o `role="alert"` según severidad.
- Loading: `aria-busy="true"` + `aria-live="polite"`.

---

### 6. Teclado

**Regla**: toda acción accesible por mouse debe ser accesible por teclado.

**Atajos**:

- `Tab` / `Shift+Tab`: navegar.
- `Enter` / `Space`: activar.
- `Escape`: cerrar modales/dropdowns.

**Trampa de foco**: en modales y bottom sheets, el foco debe quedarse dentro. Usar `@angular/cdk/a11y` (`cdkTrapFocus`).

---

### 7. Formularios

**Regla**: los formularios deben:

- Asociar cada input con su label.
- Anunciar errores con `aria-invalid` y `aria-describedby`.
- Marcar campos requeridos con `aria-required` o `required`.
- Agrupar radios/checkboxes con `<fieldset>` + `<legend>`.

**Ejemplo**:

```html
<label for="email">Email</label>
<input
  id="email"
  type="email"
  [attr.aria-invalid]="hasError()"
  [attr.aria-describedby]="hasError() ? 'email-error' : null"
/>
@if (hasError()) {
<p id="email-error" role="alert">{{ errorMessage() }}</p>
}
```

---

### 8. Imágenes

**Regla**: toda imagen debe tener `alt`.

- Imagen con significado: `alt="Descripción"`.
- Imagen decorativa: `alt=""`.
- Icono con acción: `aria-label` en el botón contenedor.

**Ejemplo**:

```html
<button aria-label="Eliminar cliente">
  <lucide-icon name="trash" />
</button>
```

---

## Verificación

Antes de considerar un feature terminado:

- [ ] Navegación completa por teclado.
- [ ] Focus visible en todos los elementos interactivos.
- [ ] Contraste AA en todos los textos y bordes.
- [ ] Labels en todos los inputs.
- [ ] `alt` en todas las imágenes.
- [ ] Roles correctos en modales y toasts.
- [ ] Sin errores en axe DevTools o Lighthouse.

**Herramientas**:

- Lighthouse (Chrome DevTools → Lighthouse → Accessibility).
- axe DevTools (extensión de Chrome).
- NVDA o VoiceOver (lectores de pantalla, para verificación manual).

---

## Referencias

- [README de design](./README.md)
- [Decisiones transversales](./decisions.md)
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [Angular CDK a11y](https://material.angular.io/cdk/a11y/overview)

---

_Accesibilidad v1.0_
