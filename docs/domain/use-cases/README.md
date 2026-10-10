# Casos de Uso - Índice

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.2
- **Fecha:** Octubre 2026
- **Total:** 74 MVP + 28 Fase 2 + 4 Fase 3 = 106 casos de uso
- **Próxima revisión:** Al cierre del modelo conceptual

## Propósito

Este directorio contiene la definición de **qué construye el sistema**, feature por feature. Cada archivo es autocontenido y referencia al glosario, al diagrama de estados y a las reglas de negocio cuando aplica.

**Es la fuente de verdad para implementación.** Si el código contradice estos documentos, el código está mal.

## Índice de features

| #   | Feature                  | Archivo                                                        | MVP    | Fase 2 | Fase 3 |
| --- | ------------------------ | -------------------------------------------------------------- | ------ | ------ | ------ |
| 01  | Autenticación y Sesión   | [01-auth.md](./01-auth.md)                                     | 3      | 2      | 1      |
| 02  | Onboarding de Taller     | [02-onboarding-taller.md](./02-onboarding-taller.md)           | 5      | 2      | 1      |
| 03  | Clientes                 | [03-clientes.md](./03-clientes.md)                             | 5      | 1      | 1      |
| 04  | Vehículos                | [04-vehiculos.md](./04-vehiculos.md)                           | 5      | 2      | 0      |
| 05  | Órdenes de Trabajo       | [05-ordenes-trabajo.md](./05-ordenes-trabajo.md)               | 10     | 4      | 0      |
| 06  | Inspecciones y Hallazgos | [06-inspecciones-hallazgos.md](./06-inspecciones-hallazgos.md) | 6      | 0      | 0      |
| 07  | Diagnósticos             | [07-diagnosticos.md](./07-diagnosticos.md)                     | 3      | 1      | 0      |
| 08  | Reparaciones             | [08-reparaciones.md](./08-reparaciones.md)                     | 10     | 1      | 0      |
| 09  | Repuestos e Insumos      | [09-repuestos-insumos.md](./09-repuestos-insumos.md)           | 5      | 1      | 0      |
| 10  | Cotizaciones             | [10-cotizaciones.md](./10-cotizaciones.md)                     | 5      | 2      | 0      |
| 11  | Garantías                | [11-garantias.md](./11-garantias.md)                           | 2      | 2      | 0      |
| 12  | Fotos y Evidencia        | [12-fotos-evidencia.md](./12-fotos-evidencia.md)               | 5      | 1      | 0      |
| 13  | Documentos PDF           | [13-documentos-pdf.md](./13-documentos-pdf.md)                 | 5      | 1      | 0      |
| 14  | Reportes                 | [14-reportes.md](./14-reportes.md)                             | 3      | 4      | 0      |
| 15  | Administración SaaS      | [15-administracion-saas.md](./15-administracion-saas.md)       | 2      | 4      | 1      |
|     | **Total**                |                                                                | **74** | **28** | **4**  |

## Orden de implementación

El orden no es alfabético ni por prioridad, sino por **dependencias técnicas**. No se puede implementar órdenes sin clientes y vehículos, no se puede implementar cotizaciones sin reparaciones.

1. `01-auth.md` — Sin auth, no hay nada.
2. `02-onboarding-taller.md` — Sin taller, no hay contexto.
3. `03-clientes.md` — Entidad base.
4. `04-vehiculos.md` — Depende de clientes.
5. `05-ordenes-trabajo.md` — Depende de clientes y vehículos. **Feature central.**
6. `06-inspecciones-hallazgos.md` — Depende de órdenes.
7. `07-diagnosticos.md` — Depende de hallazgos.
8. `08-reparaciones.md` — Depende de diagnósticos.
9. `09-repuestos-insumos.md` — Depende de reparaciones.
10. `10-cotizaciones.md` — Depende de reparaciones.
11. `11-garantias.md` — Depende de órdenes completadas.
12. `12-fotos-evidencia.md` — Transversal, se implementa con intake.
13. `13-documentos-pdf.md` — Depende de cotizaciones y órdenes.
14. `14-reportes.md` — Depende de todo lo anterior.
15. `15-administracion-saas.md` — Panel para ti, no para el taller.

## Convenciones de referencia

- **Caso de uso**: `UC-XXX-NN` (ej: `UC-WO-01`, `UC-QUOTE-04`)
- **Regla de negocio**: `RT-NN` (ej: `RT-03`, `RT-11`)
- **Transición de estado**: `T-NN` (ej: `T-14`, `T-18`)
- **Decisión de arquitectura**: `ADR-NNN` (ej: `ADR-002`)

Todas las referencias cruzadas usan estos IDs. No inventes IDs nuevos sin actualizar los índices.

## Cómo agregar un nuevo caso de uso

1. Copia `_template.md` al feature correspondiente.
2. Asigna el siguiente ID disponible en la secuencia (`UC-XXX-NN`).
3. Documenta con el formato estándar.
4. Actualiza la tabla de este README.
5. Si el caso de uso genera una nueva regla de negocio, agrégala a `../business-rules.md`.

## Cómo agregar un nuevo feature

1. Crea un nuevo archivo `NN-nombre-feature.md` (usa el siguiente número).
2. Copia el contenido de `_template.md`.
3. Documenta los casos de uso del feature.
4. Actualiza la tabla de este README.
5. Actualiza el orden de implementación si aplica.

## Referencias

- [Glosario del dominio](../glossary.md)
- [Actores y roles](../actors-and-roles.md)
- [Diagrama de estados](../state-machine.md)
- [Reglas de negocio](../business-rules.md)
- [Modelo conceptual](../conceptual-model.md) _(pendiente)_

_Casos de Uso Priorizados v1.2 — Documento vivo. Próxima revisión al cierre del modelo conceptual._
