# ADR-014: Logo del taller en un bucket público `logos`

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-11
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** [ADR-010](./ADR-010-un-bucket.md) (solo la parte "un solo bucket"; los PDFs siguen sin almacenarse)
- **Superseded por:** —

---

## Contexto

El `owner` puede subir el logo de su taller al crearlo (UC-WS-08) y cambiarlo después desde la configuración (UC-WS-02). La columna `workshops.logo_url` ya existe, pero no hay dónde guardar el archivo: el único bucket es `photos`, privado, con URLs firmadas de 1 hora ([ADR-009](./ADR-009-storage-privado.md)), y [ADR-010](./ADR-010-un-bucket.md) fijó "un solo bucket" porque no había nada más que almacenar.

El logo se diferencia de las fotos de las órdenes:

- **No es sensible**: es la imagen pública del negocio.
- **Se muestra en toda la app** (encabezado, PDFs, pantalla de instalación de la PWA), no en una pantalla concreta.
- **Lo gestiona solo el `owner`**, mientras que las fotos las sube cualquier miembro.

---

## Decisión

Un **segundo bucket, `logos`, público**, solo para el logo del taller.

- **Lectura pública**: la URL pública del archivo se guarda en `workshops.logo_url`. No caduca ni requiere firma.
- **Escritura solo del `owner`** del taller, mediante policies sobre `storage.objects`.
- **Path**: `{workshop_id}/{uuid}.{ext}`. Cada subida usa un UUID nuevo; no se sobrescribe. Así la URL cambia con el logo y no hay caché obsoleta. Tras guardar la URL nueva se elimina el archivo anterior.
- **Límites**: 1 MB por archivo; `image/jpeg`, `image/png` y `image/webp`. No se admite SVG (puede contener scripts). El cliente redimensiona a un máximo de 512 px por lado antes de subir.
- El bucket `photos` y [ADR-009](./ADR-009-storage-privado.md) no cambian. Los PDFs siguen sin almacenarse.

---

## Alternativas consideradas

### Alternativa A: Guardar el logo en `photos` (privado)

- **Descripción**: ruta `{workshop_id}/logo/{uuid}.{ext}` y URL firmada.
- **Ventajas**: no añade un bucket ni matiza ADR-010.
- **Desventajas**: la URL firmada caduca cada hora y hay que regenerarla y cachearla para algo que se muestra en todas partes; `photos` permite subir a cualquier miembro, y el logo debería ser solo del `owner`; mezcla un archivo público con evidencia privada.
- **Razón de descarte**: complejidad sin beneficio para un dato que no es sensible.

### Alternativa B: Guardar el logo como imagen en base64 en la base de datos

- **Descripción**: columna `logo` con el contenido.
- **Ventajas**: sin Storage.
- **Desventajas**: infla `workshops`, que se lee constantemente; sin CDN ni caché de navegador.
- **Razón de descarte**: mala práctica para binarios.

### Alternativa C: Logo por URL externa

- **Descripción**: el `owner` pega la URL de una imagen alojada en otro sitio.
- **Ventajas**: sin Storage.
- **Desventajas**: depende de terceros, puede dejar de existir y no valida el formato ni el tamaño.
- **Razón de descarte**: no es confiable ni da el control que se espera.

---

## Consecuencias

### Positivas

- La URL del logo es estable y sirve para el encabezado, los PDFs y la PWA sin regenerar firmas.
- Solo el `owner` puede escribir; el aislamiento por taller sigue en el primer segmento del path.
- `photos` queda intacto (privado, evidencia).

### Negativas

- Hay dos buckets con reglas distintas que mantener y documentar. Cualquiera que tenga la URL ve el logo (es el comportamiento buscado).
- `logo_url` guarda la **URL completa**: si el proyecto de Supabase cambia de host, esas URLs hay que reescribirlas.
- El job `Database` de la CI arranca Supabase sin `storage-api`, así que la migración del bucket se omite ahí (igual que la de `photos`) y sus pruebas solo corren en local.
- Los logos reemplazados se eliminan desde el cliente; si falla el borrado queda un archivo huérfano (la limpieza de huérfanos se evalúa en Fase 2, como las fotos: D-ST-10).

### Neutras

- Sigue sin existir una tabla de metadatos para el logo: la fuente de verdad es `workshops.logo_url`.
