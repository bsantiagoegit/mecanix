# ADR-010: Un solo bucket (`photos`), PDFs no se almacenan

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-10
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

El sistema genera dos tipos de archivos binarios:

1. **Fotos**: imágenes del intake, hallazgos, diagnósticos, reparaciones.
2. **PDFs**: informes iniciales y finales.

Dos opciones:

1. **Dos buckets**: `photos` para imágenes, `documents` para PDFs.
2. **Un solo bucket** (`photos`): solo se almacenan imágenes. Los PDFs se generan en el cliente y se comparten directamente.

Inicialmente (v1.0 de la estrategia de Storage) se decidió crear dos buckets. Pero al revisar:

- No existe una tabla `documents` en el modelo relacional.
- Los PDFs se generan en el cliente desde los datos en PostgreSQL.
- Los PDFs son regenerables: si el cliente pide una copia, se regenera.
- No hay necesidad de trazabilidad de "qué informe se envió y cuándo" en MVP.

---

## Decisión

**Un solo bucket** (`photos`) para imágenes. Los PDFs (informes iniciales y finales) se generan en el cliente (html2canvas + jsPDF) y se **comparten directamente** por WhatsApp/email o se descargan. **No se almacenan en Storage en MVP.**

---

## Alternativas consideradas

### Alternativa A: Dos buckets (`photos` + `documents`)

- **Descripción**: bucket separado para PDFs.
- **Ventajas**: separación clara, distintas reglas de MIME y tamaño.
- **Desventajas**: no hay tabla `documents` que respalde el bucket. Sin metadata en PostgreSQL, no hay trazabilidad. Consume storage innecesariamente.
- **Razón de descarte**: no hay tabla `documents`. El bucket quedaría huérfano.

### Alternativa B: Un bucket con dos prefijos

- **Descripción**: `{workshop_id}/photos/...` y `{workshop_id}/documents/...`.
- **Ventajas**: un solo bucket.
- **Desventajas**: mismas desventajas que A (sin tabla de respaldo para PDFs).
- **Razón de descarte**: mismo problema.

### Alternativa C: Crear tabla `documents` y bucket

- **Descripción**: crear entidad `documents` en el modelo + bucket para almacenar PDFs.
- **Ventajas**: trazabilidad completa.
- **Desventajas**: tabla adicional, más código, más storage. Los PDFs son regenerables.
- **Razón de descarte**: overengineering para MVP. Se puede agregar en Fase 2 si el negocio lo pide.

---

## Consecuencias

### Positivas

- Simplicidad: un solo bucket, una sola tabla (`photos`).
- Ahorro de storage (los PDFs no se almacenan).
- Los PDFs siempre reflejan los datos actuales (se regeneran).
- El MVP se construye más rápido.

### Negativas

- No hay trazabilidad de "qué informe se envió al cliente y cuándo".
- Si el cliente pide una copia meses después, se regenera (puede diferir de la versión original si los datos cambiaron).

### Neutras

- Si en Fase 2 se necesita trazabilidad, se crea tabla `documents` + bucket.
- La decisión es reversible (agregar, no modificar).

---

## Referencias

- [Estrategia de storage: D-ST-13](../storage/decisions.md)
- [Estrategia de storage: buckets](../storage/buckets.md)
- [ADR-009: Storage privado](./ADR-009-storage-privado.md)

---

_ADR-010 — Un solo bucket (`photos`), PDFs no se almacenan_
