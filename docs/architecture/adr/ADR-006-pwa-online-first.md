# ADR-006: PWA con estrategia online-first

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-10
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

La app se usará principalmente en dispositivos móviles en un taller mecánico. El taller tiene WiFi, pero **la conexión puede ser inestable**.

Tres estrategias posibles para PWA:

1. **Online-only**: la app requiere conexión permanente.
2. **Online-first con tolerancia a fallos**: la app funciona online, pero tolera caídas breves de conexión.
3. **Offline-first**: la app funciona sin conexión, sincroniza cuando vuelve.

El offline-first es complejo:

- Requiere IndexedDB.
- Requiere colas de operaciones pendientes.
- Requiere resolución de conflictos.
- Requiere sincronización bidireccional.

---

## Decisión

**Online-first con tolerancia a fallos**:

- La app requiere conexión para operaciones de escritura.
- Cachea el shell de la app (assets, JS, CSS) con service worker.
- Guarda **borradores de formularios** en `localStorage` para no perder trabajo.
- Muestra un banner discreto cuando el usuario está offline.
- Reintenta operaciones fallidas con backoff.
- **No implementa** IndexedDB, sincronización bidireccional ni colas offline en MVP.

---

## Alternativas consideradas

### Alternativa A: Online-only

- **Descripción**: la app requiere conexión siempre. Si no hay conexión, no funciona.
- **Ventajas**: máxima simplicidad.
- **Desventajas**: si se cae la conexión por 30 segundos, el usuario pierde el formulario que estaba llenando.
- **Razón de descarte**: la conexión del taller no es confiable. Perder trabajo es inaceptable.

### Alternativa B: Offline-first completo

- **Descripción**: la app funciona sin conexión, sincroniza cuando vuelve.
- **Ventajas**: máxima disponibilidad.
- **Desventajas**:
  - IndexedDB + colas + resolución de conflictos = 2-3 meses adicionales.
  - El taller no lo necesita (tiene WiFi, aunque sea inestable).
  - Los conflictos son difíciles de resolver (dos mecánicos editando la misma orden).
- **Razón de descarte**: overengineering. No justifica el esfuerzo.

### Alternativa C: Offline-capable para lectura

- **Descripción**: cachear datos de lectura (clientes, vehículos) para consulta offline, pero requerir conexión para escritura.
- **Ventajas**: el mecánico puede consultar datos aunque no haya conexión.
- **Desventajas**: la caché de datos es compleja (invalidación, staleness). El taller no lo necesita.
- **Razón de descarte**: complejidad no justificada.

---

## Consecuencias

### Positivas

- Simplicidad: no hay que implementar IndexedDB ni sincronización.
- La app carga rápido desde caché (shell cacheada).
- Los borradores de formularios evitan perder trabajo.
- El usuario ve claramente cuándo está offline.

### Negativas

- Si no hay conexión, no se puede crear una orden.
- Si se cae la conexión a mitad de un upload de foto, hay que reintentar.
- No hay funcionamiento offline real.

### Neutras

- El service worker cachea assets y shell, no datos.
- La estrategia se puede evolucionar a offline-first en Fase 2 si el negocio lo pide.

---

## Referencias

- [Angular PWA](https://angular.dev/guide/service-worker-intro)
- [Estrategia de storage](../storage/README.md)

---

_ADR-006 — PWA con estrategia online-first_
