# Componentes Base

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir el catálogo de componentes base que viven en `shared/components/`. Cada componente es standalone, con `input()` y `output()`, sin lógica de negocio.

---

## Catálogo

### Formularios

#### `app-button`

**Propósito**: botón genérico.

**Inputs**:

- `variant`: `'primary' | 'secondary' | 'danger' | 'ghost' | 'link'` (default: `'primary'`).
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`).
- `type`: `'button' | 'submit' | 'reset'` (default: `'button'`).
- `disabled`: `boolean` (default: `false`).
- `loading`: `boolean` (default: `false`).
- `fullWidth`: `boolean` (default: `false`).

**Outputs**:

- `clicked`: emite cuando se hace click (si no está disabled ni loading).

**Ejemplo**:

```html
<app-button variant="primary" (clicked)="save()">Guardar</app-button>
<app-button variant="danger" [loading]="isDeleting()" (clicked)="delete()">Eliminar</app-button>
```

**Estados visuales**:

- Default, hover, active, focus, disabled, loading.

#### `app-input`

**Propósito**: campo de texto.

**Inputs**:

- `type`: `'text' | 'email' | 'tel' | 'number' | 'password' | 'search'` (default: `'text'`).
- `label`: `string`.
- `placeholder`: `string`.
- `hint`: `string` (texto de ayuda debajo).
- `error`: `string` (mensaje de error).
- `required`: `boolean`.
- `disabled`: `boolean`.
- `autocomplete`: `string`.
- `revealable`: `boolean` (default: `false`). Solo aplica si `type="password"`. Muestra un botón de ojo para ver/ocultar.

**Model**: `value` (`model<string>()`).

**Ejemplo con revealable**:

```html
<app-input
  type="password"
  label="Clave del vehículo"
  [(value)]="keyCode"
  [revealable]="true"
  hint="Solo si el vehículo tiene inmovilizador"
/>
```

#### `app-textarea`

**Propósito**: campo de texto largo.

**Inputs**: mismos que `app-input` + `rows` (default: 4), `maxLength`.

#### `app-select`

**Propósito**: dropdown de selección.

**Inputs**:

- `label`: `string`.
- `options`: `Array<{ value: string; label: string }>`.
- `placeholder`: `string`.
- `error`: `string`.
- `disabled`: `boolean`.

**Model**: `value` (`model<string | null>()`).

#### `app-checkbox`

**Propósito**: checkbox.

**Inputs**:

- `label`: `string`.
- `hint`: `string`.
- `disabled`: `boolean`.

**Model**: `checked` (`model<boolean>()`).

#### `app-radio-group`

**Propósito**: opciones mutuamente excluyentes.

**Inputs**:

- `label`: `string`.
- `options`: `Array<{ value: string; label: string; hint?: string }>`.
- `direction`: `'row' | 'column'` (default: `'column'`).

**Model**: `value` (`model<string | null>()`).

---

### Layout

#### `app-card`

**Propósito**: contenedor de información.

**Inputs**:

- `padding`: `'none' | 'sm' | 'md' | 'lg'` (default: `'md'`).
- `shadow`: `'none' | 'sm' | 'md'` (default: `'sm'`).
- `clickable`: `boolean` (default: `false`).

**Outputs**:

- `clicked`: si `clickable` es `true`.

**Ejemplo**:

```html
<app-card>
  <h3>Título</h3>
  <p>Contenido</p>
</app-card>
```

#### `app-tabs`

**Propósito**: navegación entre secciones.

**Inputs**:

- `tabs`: `Array<{ id: string; label: string; badge?: string }>`.
- `activeId`: `string`.

**Outputs**:

- `activeIdChange`: emite cuando cambia la tab.

---

### Utilidades

#### `app-theme-toggle`

**Propósito**: cambiar entre tema claro, oscuro y sistema.

**Inputs**: ninguno (usa `ThemeService` internamente).

**Outputs**: ninguno (persiste en `localStorage`).

**UI**: 3 botones en un grupo, alineados horizontalmente:

- ☀️ Claro
- 🌙 Oscuro
- 💻 Sistema

El botón activo se marca visualmente.

**Ejemplo**:

```html
<app-theme-toggle />
```

---

### Feedback

#### `app-modal`

**Propósito**: diálogo modal.

**Inputs**:

- `title`: `string`.
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`).
- `closable`: `boolean` (default: `true`).

**Model**: `isOpen` (`model<boolean>()`).

**Outputs**:

- `closed`: emite cuando se cierra.

**Ejemplo**:

```html
<app-modal title="Confirmar" [(isOpen)]="showConfirm">
  <p>¿Estás seguro?</p>
  <div actions>
    <app-button variant="ghost" (clicked)="showConfirm.set(false)">Cancelar</app-button>
    <app-button variant="danger" (clicked)="confirm()">Eliminar</app-button>
  </div>
</app-modal>
```

#### `app-bottom-sheet`

**Propósito**: acciones desde abajo (móvil).

**Inputs**:

- `title`: `string`.
- `closable`: `boolean`.

**Model**: `isOpen` (`model<boolean>()`).

**Razón**: en móvil, los modales centrados son difíciles de alcanzar con el pulgar. Los bottom sheets son más ergonómicos.

#### `app-toast`

**Propósito**: notificaciones temporales.

**Uso**: se maneja con un `ToastService` global. El componente `app-toast-container` se coloca en el `AppShellComponent`.

**Tipos**: `success`, `error`, `warning`, `info`, `update`.

**Ejemplo**:

```typescript
this.toast.success('Cliente creado');
this.toast.error('No se pudo guardar');
this.toast.showUpdate('Hay una actualización', () => location.reload());
```

#### `app-skeleton`

**Propósito**: placeholder de carga.

**Inputs**:

- `variant`: `'text' | 'circle' | 'rect'` (default: `'text'`).
- `width`: `string` (default: `'100%'`).
- `height`: `string` (default: auto según variant).
- `count`: `number` (default: `1`).

**Ejemplo**:

```html
<app-skeleton variant="text" [count]="3" />
```

#### `app-empty-state`

**Propósito**: estado vacío.

**Inputs**:

- `icon`: `string` (nombre de icono Lucide).
- `title`: `string`.
- `message`: `string`.
- `actionLabel`: `string`.

**Outputs**:

- `action`: si tiene `actionLabel`.

#### `app-error-state`

**Propósito**: estado de error.

**Inputs**:

- `title`: `string` (default: `'Algo salió mal'`).
- `message`: `string`.
- `retryLabel`: `string` (default: `'Reintentar'`).

**Outputs**:

- `retry`: emite cuando el usuario toca "Reintentar".

#### `app-key-display`

**Propósito**: mostrar la clave del vehículo con toggle ver/ocultar.

**Inputs**:

- `keyCode`: `string | null`.
- `size`: `'sm' | 'md'` (default: `'md'`).

**Comportamiento**:

- Si `keyCode` es `null`, no muestra nada.
- Si tiene valor, muestra la clave oculta (`•••••`) con un botón de ojo.
- Al tocar el ojo, revela la clave.
- El estado (revelada/oculta) es local al componente.

**Ejemplo**:

```html
<app-key-display [keyCode]="vehicle.keyCode" />
```

---

### Datos

#### `app-badge`

**Propósito**: etiqueta de estado.

**Inputs**:

- `variant`: `'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'`.
- `size`: `'sm' | 'md'`.

**Ejemplo**:

```html
<app-badge variant="success">Completada</app-badge>
<app-badge variant="warning">Pendiente</app-badge>
```

#### `app-avatar`

**Propósito**: foto o icono de usuario.

**Inputs**:

- `src`: `string` (URL de la foto).
- `name`: `string` (para iniciales si no hay foto).
- `size`: `'sm' | 'md' | 'lg'`.

**Ejemplo**:

```html
<app-avatar [name]="user().fullName" size="md" />
```

---

### Fotos

#### `app-photo-uploader`

**Propósito**: subir fotos desde cámara o galería.

**Inputs**:

- `maxPhotos`: `number`.
- `maxSizeMb`: `number` (default: 5).
- `entityType`: `'intake' | 'finding' | 'diagnosis' | 'repair' | 'work_order'`.
- `entityId`: `string`.
- `workOrderId`: `string`.

**Outputs**:

- `uploaded`: emite cuando se sube una foto.
- `removed`: emite cuando se elimina.

**Integración**: usa `PhotosService` para subir a Supabase Storage + insertar en tabla `photos`.

**Detalle**: ver [`storage/upload-flow.md`](../architecture/storage/upload-flow.md).

#### `app-photo-gallery`

**Propósito**: mostrar galería de fotos.

**Inputs**:

- `photos`: `Array<Photo>`.
- `columns`: `number` (default: 3 en móvil, 4 en desktop).
- `clickable`: `boolean` (default: `true`).

**Outputs**:

- `photoClicked`: emite cuando se toca una foto.

---

## Convenciones

### Estructura de cada componente

```
shared/components/{component-name}/
├── {component-name}.component.ts
├── {component-name}.component.html
├── {component-name}.component.css     ← solo si necesita estilos custom
└── {component-name}.component.spec.ts
```

### Naming

- Selector: `app-{component-name}`.
- Clase: `{ComponentName}Component`.
- Archivos: `kebab-case`.

### API

- `input()` para datos de entrada.
- `output()` para eventos.
- `model()` para two-way binding.
- Signals internos para estado.

### Sin lógica de negocio

Los componentes base no saben de Supabase, ni del store, ni de ningún servicio del dominio. Solo reciben datos y emiten eventos.

---

## Referencias

- [README de design](./README.md)
- [Decisiones transversales](./decisions.md)
- [Tokens](./tokens.md)
- [Arquitectura Frontend](../architecture/frontend/feature-template.md)

---

_Componentes Base v1.0_
