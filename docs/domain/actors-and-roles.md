# Actores y Roles

## Actores del sistema

| Actor      | Descripción                    | Es usuario del sistema |
| ---------- | ------------------------------ | ---------------------- |
| Owner      | Dueño/administrador del taller | Sí                     |
| Advisor    | Asesor/cotizador               | Sí                     |
| Mechanic   | Mecánico                       | Sí                     |
| Customer   | Propietario del vehículo       | **No** (MVP)           |
| SaaS Admin | Tú, dueño del SaaS             | Sí                     |

## Matriz de permisos (MVP)

| Recurso                           | Owner | Advisor | Mechanic            |
| --------------------------------- | ----- | ------- | ------------------- |
| Crear su propio taller            | ✅ ¹  | ❌      | ❌                  |
| Configurar taller                 | ✅    | ❌      | ❌                  |
| Invitar usuarios                  | ✅ ²  | ❌      | ❌                  |
| Ver todos los clientes            | ✅    | ✅      | ⚠️ solo nombre      |
| Editar cliente                    | ✅    | ✅      | ❌                  |
| Eliminar cliente (soft)           | ✅    | ❌      | ❌                  |
| Ver vehículos                     | ✅    | ✅      | ✅                  |
| Editar vehículo                   | ✅    | ✅      | ❌                  |
| Crear orden (draft)               | ✅    | ✅      | ❌                  |
| Confirmar recepción               | ✅    | ✅      | ❌                  |
| Ver órdenes abiertas              | ✅    | ✅      | ✅                  |
| Ver órdenes cerradas              | ✅    | ✅      | ⚠️ solo las propias |
| Iniciar inspección                | ❌    | ❌      | ✅                  |
| Registrar hallazgos               | ❌    | ❌      | ✅                  |
| Crear reparación recomendada      | ❌    | ❌      | ✅                  |
| Generar cotización                | ✅    | ✅      | ❌                  |
| Aprobar reparación                | ✅    | ✅      | ❌                  |
| Ejecutar reparación               | ❌    | ❌      | ✅                  |
| Registrar tiempo                  | ❌    | ❌      | ✅                  |
| Cerrar orden                      | ❌    | ❌      | ✅                  |
| Entregar vehículo                 | ✅    | ✅      | ❌                  |
| Cancelar orden                    | ✅    | ✅      | ❌                  |
| Ver reportes                      | ✅    | ❌      | ❌                  |
| Ver datos financieros             | ✅    | ✅      | ❌                  |
| Ver datos de contacto del cliente | ✅    | ✅      | ❌                  |

**Leyenda**: ✅ permitido | ❌ denegado | ⚠️ parcial (ver notas)

¹ Lo hace quien se registra y aún no tiene taller; queda como `owner` (UC-WS-08). Solo se puede tener un taller por cuenta.
² Solo el `owner` invita, y solo a `advisor` o `mechanic` (UC-WS-03).

## Notas

- **MVP**: un usuario pertenece a **un solo taller** y tiene **un solo rol** en él.
- El taller tiene un único `owner`: quien lo crea. El `owner` no se invita ni se transfiere en el MVP.
- Fase 2+: varios talleres por cuenta y varios roles se evaluarán más adelante.
- El Mechanic solo ve el nombre del cliente, no teléfono/dirección/email.
- El Mechanic solo ve órdenes abiertas o las que él trabajó.

## Reglas de RLS (referencia)

- Todas las tablas de negocio filtran por `workshop_id` del usuario autenticado.
- Solo Owner y Advisor pueden ver datos financieros (`quotes`, `items.cost`).
- Solo Mechanic puede crear `inspections`, `findings`, `diagnoses`.
- Solo Owner y Advisor pueden `UPDATE work_orders.status` a estados de cancelación.
