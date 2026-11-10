# Decisiones Transversales — Seguridad (RLS)

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Decisiones que aplican a **todas o casi todas las policies** de RLS. Se documentan aquí para no repetirlas en cada archivo de policies.

Si una decisión aplica a una sola tabla, va en el archivo de esa tabla dentro de `policies/`.

---

## D-RLS-01: RLS en todas las tablas

`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` en las 27 tablas. Supabase deniega todo por defecto si RLS está habilitado y no hay policies.

**Razón**: Supabase expone PostgREST. Sin RLS, cualquier usuario autenticado podría leer cualquier tabla vía API.

---

## D-RLS-02: Funciones helper `SECURITY DEFINER`

Funciones en `public` que devuelven talleres y roles del usuario autenticado. Se usan en las policies para evitar subqueries repetidos.

**Razón**: la lógica de "a qué talleres pertenece este usuario" vive en un solo lugar. Sin helpers, cada policy necesita un subquery con JOIN a `workshop_members`.

**Detalle**: ver [`helpers.md`](./helpers.md).

---

## D-RLS-03: Policies separadas por operación

`SELECT`, `INSERT`, `UPDATE`, `DELETE` tienen policies separadas. No usar `FOR ALL`.

**Razón**: más verboso pero más auditable. Un `INSERT` y un `SELECT` tienen reglas distintas. `FOR ALL` oculta la intención.

---

## D-RLS-04: RLS es la defensa principal

Un usuario malicioso puede llamar a PostgREST directamente sin pasar por Angular. RLS protege los datos en el origen.

**Razón**: los guards de Angular son solo UX (ocultan botones). Los RPCs son defensa final para lógica compleja. RLS es defensa principal para acceso a datos.

---

## D-RLS-05: `workshop_members` con policies especiales

`workshop_members` tiene policies más restrictivas:

- Un usuario ve sus propias membresías.
- Un `owner` ve todas las membresías de su taller.
- Solo `owner` invita (INSERT) y desactiva (UPDATE).
- Nadie elimina membresías (soft delete vía `status`).

**Razón**: es la tabla más sensible. Si un usuario puede modificar sus propias membresías, puede escalar privilegios.

---

## D-RLS-06: Tablas derivadas usan `EXISTS` + JOIN

`repair_findings`, `quote_items`, `work_order_status_history` no tienen `workshop_id`. Sus policies usan `EXISTS (SELECT 1 FROM <padre> WHERE ... AND workshop_id = ANY(auth_workshop_ids()))`.

**Razón**: agregar `workshop_id` a estas tablas sería redundante y crearía riesgo de inconsistencia. `EXISTS` con JOIN es aceptable en rendimiento porque la FK ya tiene índice.

---

## D-RLS-07: `photos` con `workshop_id` directo

Aunque la relación con entidades es polimórfica (`entity_type` + `entity_id`), `workshop_id` está en la tabla. Las policies usan `workshop_id = ANY(auth_workshop_ids())` directo.

**Razón**: la relación polimórfica no tiene FK, pero `workshop_id` sí está en la tabla, entonces RLS funciona directo. La integridad de `entity_id` se valida en el RPC de creación de foto.

---

## D-RLS-08: Sin `WITH CHECK` en SELECT

Las policies `FOR SELECT` solo usan `USING`. `WITH CHECK` solo aplica a `INSERT` y `UPDATE`.

**Razón**: error de sintaxis si se pone `WITH CHECK` en `SELECT`.

---

## D-RLS-09: `service_role` solo en el servidor; los flujos de usuario pasan por funciones controladas

`service_role` bypasea RLS y **nunca** llega al cliente. Se usa únicamente en el servidor: operaciones de administración del SaaS (purgar talleres eliminados, crear talleres manualmente en Fase 2) y la Edge Function `invite-user` ([ADR-013](../adr/ADR-013-invitaciones-edge-function.md)).

Los usuarios autenticados no insertan en `workshops` ni en `workshop_members` directamente. Lo que sí pueden hacer, lo hacen mediante funciones `SECURITY DEFINER` con reglas propias:

- `create_workshop(...)`: crea el taller y la membresía `owner` del propio usuario ([ADR-012](../adr/ADR-012-onboarding-self-service.md)).
- `accept_invitation()`: activa la membresía `invited` del propio usuario.

**Razón**: un `INSERT` directo no permite imponer "un taller por cuenta" ni evitar que alguien se haga `owner` de un taller ajeno. Una función concentra las reglas en un solo punto. El panel de SaaS admin, cuando exista, es una app separada.

**Historia**: hasta noviembre de 2026 esta decisión decía que los talleres los creaba el administrador a mano. [ADR-012](../adr/ADR-012-onboarding-self-service.md) la sustituyó por el onboarding self-service.

---

## D-RLS-10: `auth.uid()` como fuente de verdad

Todas las policies usan `auth.uid()` (función de Supabase que devuelve el UUID del usuario autenticado). Nunca se confía en un `user_id` que venga del cliente.

**Razón**: `auth.uid()` lo setea Supabase al validar el JWT. Un cliente no puede falsificarlo. Cualquier `user_id` en el body de un request es ignorado por RLS.

---

## D-RLS-11: Las referencias entre filas no cruzan de un taller a otro

Una clave foránea normal solo comprueba que el `id` referenciado exista, **sin pasar por RLS**. Con `WITH CHECK (auth_is_advisor_or_owner_in(workshop_id))` un asesor del taller A podía insertar una fila de su taller (`workshop_id = A`) que apuntara al cliente, vehículo u orden del taller B: la policy valida la fila, no a quién apunta.

La base de datos lo impide, para cualquier rol (también `service_role` y las funciones `SECURITY DEFINER`):

- Las FK entre tablas con `workshop_id` son **compuestas**: `(workshop_id, columna) → padre (workshop_id, id)`. Cada tabla padre expone `UNIQUE (workshop_id, id)` ([D-T-11](../data-model/decisions.md)).
- Las personas de una fila (`advisor_id`, `mechanic_id`, `created_by`, `approved_by`) deben ser **miembros del mismo taller**: `(workshop_id, user_id) → workshop_members`. La membresía conserva su fila al desactivarse (`inactive`), así que el historial sigue siendo válido.
- Las tablas de unión sin `workshop_id` (`repair_findings`, `quote_items`) lo comprueban con un trigger (`cross_workshop_reference`, `ERRCODE 23514`).

**Excepciones deliberadas**: `photos.uploaded_by` lo fija la policy (`= auth.uid()`) y `work_order_status_history.actor_id` lo fija un trigger; `photos.entity_id` es polimórfico y no admite FK, así que lo valida `add_photo()` (pendiente). Un test recorre el catálogo y falla si aparece una FK de una sola columna entre dos tablas con `workshop_id`, para que las tablas futuras no la olviden.

**Razón**: RLS decide quién puede escribir una fila, no qué referencias son legítimas. Con claves compuestas la integridad entre talleres es declarativa y no depende de que cada policy, función o Edge Function recuerde validarla.

---

## D-RLS-12: Los datos de contacto del cliente solo los leen `owner` y `advisor`

RLS no oculta columnas, y "la app consulta la vista" es una convención, no una garantía: con la policy `USING (workshop_id = ANY(auth_workshop_ids()))` un `mechanic` podía hacer `SELECT phone, email FROM customers` directamente.

- `customers`: `SELECT` solo para `owner` y `advisor` (`customers_select_advisor_owner`). Para el `mechanic` devuelve cero filas.
- `customers_public` (nombre, sin contacto) pasa a ser una vista **del propietario** (sin `security_invoker`) con su propio filtro `workshop_id = ANY(auth_workshop_ids())`. Así el `mechanic` ve el nombre de los clientes de **su** taller y nada más; `anon` no tiene acceso.

**Contrapartida**: una vista del propietario no aplica la RLS de `customers`, por eso el filtro de taller va dentro de la vista y los tests lo cubren (aislamiento entre talleres, columnas expuestas, `anon`). Si se añade una columna a `customers_public`, hay que revisar que no sea de contacto.

---

## D-RLS-13: El soft delete de clientes y vehículos es solo del owner

Eliminar es un `UPDATE deleted_at` (no hay `DELETE`, ver D-RLS-03) y RLS no distingue qué columna cambia un `UPDATE`. La policy de `UPDATE` de `customers` y `vehicles` deja actualizar a `owner` y `advisor`, así que un asesor también podía eliminar (o restaurar) registros aunque la matriz de roles lo reserve al dueño. No había botón para hacerlo, pero la API lo permitía.

Un trigger `BEFORE UPDATE OF deleted_at` (`protect_soft_delete`) solo deja cambiar `deleted_at` al `owner` del taller (`only_owner_can_delete`). Aplica al rol `authenticated`; `service_role` y las funciones `SECURITY DEFINER` no pasan por él.

**Razón**: igual que con las membresías (`protect_workshop_member_update`), una regla "este rol no puede tocar esta columna" se impone con un trigger, no con la policy. Si otra tabla con `deleted_at` necesita la misma regla (p. ej. un catálogo), se añade el trigger con la misma función.

---

## Resumen

| ID       | Decisión                                                            |
| -------- | ------------------------------------------------------------------- |
| D-RLS-01 | RLS en todas las tablas                                             |
| D-RLS-02 | Funciones helper `SECURITY DEFINER`                                 |
| D-RLS-03 | Policies separadas por operación                                    |
| D-RLS-04 | RLS es la defensa principal                                         |
| D-RLS-05 | `workshop_members` con policies especiales                          |
| D-RLS-06 | Tablas derivadas con `EXISTS` + JOIN                                |
| D-RLS-07 | `photos` con `workshop_id` directo                                  |
| D-RLS-08 | Sin `WITH CHECK` en SELECT                                          |
| D-RLS-09 | `service_role` solo en el servidor; flujos de usuario vía funciones |
| D-RLS-10 | `auth.uid()` como fuente de verdad                                  |
| D-RLS-11 | Las referencias entre filas no cruzan de un taller a otro           |
| D-RLS-12 | Datos de contacto del cliente solo para `owner` y `advisor`         |
| D-RLS-13 | El soft delete de clientes y vehículos es solo del `owner`          |

---

## Referencias

- [README de security](./README.md)
- [Helpers](./helpers.md)
- [Vistas](./views.md)
- [Policies](./policies/README.md)

---

_Decisiones Transversales — Seguridad v1.0_
