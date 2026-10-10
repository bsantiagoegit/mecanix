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
| Crear taller                      | ✅    | ❌      | ❌                  |
| Configurar taller                 | ✅    | ❌      | ❌                  |
| Invitar usuarios                  | ✅    | ❌      | ❌                  |
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

## Notas

- Un usuario puede tener múltiples roles en el mismo taller (ej: Owner + Advisor).
- En MVP, simplificar a un rol principal por taller.
- El Mechanic solo ve el nombre del cliente, no teléfono/dirección/email.
- El Mechanic solo ve órdenes abiertas o las que él trabajó.

## Reglas de RLS (referencia)

- Todas las tablas de negocio filtran por `workshop_id` del usuario autenticado.
- Solo Owner y Advisor pueden ver datos financieros (`quotes`, `items.cost`).
- Solo Mechanic puede crear `inspections`, `findings`, `diagnoses`.
- Solo Owner y Advisor pueden `UPDATE work_orders.status` a estados de cancelación.
