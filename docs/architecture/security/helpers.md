# Funciones Helper — RLS

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Funciones SQL reutilizables que se usan en todas las policies de RLS. Se crean una vez y viven en el schema `public`.

**Decisión D-RLS-02**: usar `SECURITY DEFINER` para que lean `workshop_members` sin requerir permiso directo del usuario.

**Decisión**: `STABLE` indica que no modifican datos y pueden cachearse dentro de una transacción. Mejora performance.

---

## Helper 1: `auth_workshop_ids()`

Devuelve el array de UUIDs de talleres a los que pertenece el usuario autenticado, con `status = 'active'`.

```sql
CREATE OR REPLACE FUNCTION auth_workshop_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(workshop_id), ARRAY[]::uuid[])
    FROM workshop_members
   WHERE user_id = auth.uid()
     AND status = 'active';
$$;
```

**Uso típico**: `WHERE workshop_id = ANY(auth_workshop_ids())`.

**Por qué `COALESCE`**: si el usuario no pertenece a ningún taller, devuelve array vacío en lugar de `NULL`. `ANY(NULL)` es `NULL`, no `false`, lo que rompe policies. Con array vacío, `ANY(ARRAY[]::uuid[])` es `false`.

---

## Helper 2: `auth_role_in(p_workshop_id uuid)`

Devuelve el rol del usuario en un taller específico. `NULL` si no pertenece.

```sql
CREATE OR REPLACE FUNCTION auth_role_in(p_workshop_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role
    FROM workshop_members
   WHERE user_id = auth.uid()
     AND workshop_id = p_workshop_id
     AND status = 'active'
   LIMIT 1;
$$;
```

**Uso típico**: `auth_role_in(workshop_id) = 'owner'`.

---

## Helper 3: `auth_is_owner_in(p_workshop_id uuid)`

Devuelve `true` si el usuario es `owner` del taller.

```sql
CREATE OR REPLACE FUNCTION auth_is_owner_in(p_workshop_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workshop_members
     WHERE user_id = auth.uid()
       AND workshop_id = p_workshop_id
       AND role = 'owner'
       AND status = 'active'
  );
$$;
```

**Uso típico**: `USING (auth_is_owner_in(workshop_id))`.

---

## Helper 4: `auth_is_advisor_or_owner_in(p_workshop_id uuid)`

Devuelve `true` si el usuario es `owner` o `advisor` del taller.

```sql
CREATE OR REPLACE FUNCTION auth_is_advisor_or_owner_in(p_workshop_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workshop_members
     WHERE user_id = auth.uid()
       AND workshop_id = p_workshop_id
       AND role IN ('owner', 'advisor')
       AND status = 'active'
  );
$$;
```

**Uso típico**: `WITH CHECK (auth_is_advisor_or_owner_in(workshop_id))`.

---

## Helper 5: `auth_is_mechanic_in(p_workshop_id uuid)`

Devuelve `true` si el usuario es `mechanic` del taller.

```sql
CREATE OR REPLACE FUNCTION auth_is_mechanic_in(p_workshop_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workshop_members
     WHERE user_id = auth.uid()
       AND workshop_id = p_workshop_id
       AND role = 'mechanic'
       AND status = 'active'
  );
$$;
```

**Uso típico**: `WITH CHECK (auth_is_mechanic_in(workshop_id))`.

---

## Helper 6: `auth_shares_workshop_with(p_user_id uuid)`

Devuelve `true` si el usuario autenticado y `p_user_id` comparten al menos un taller en el que ambos están `active`.

```sql
CREATE OR REPLACE FUNCTION auth_shares_workshop_with(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM workshop_members wm1
      JOIN workshop_members wm2 ON wm1.workshop_id = wm2.workshop_id
     WHERE wm1.user_id = auth.uid()
       AND wm2.user_id = p_user_id
       AND wm1.status = 'active'
       AND wm2.status = 'active'
  );
$$;
```

**Uso típico**: `USING (auth_shares_workshop_with(id))` en `users`.

**Por qué existe**: un subquery directo sobre `workshop_members` dentro de una policy se ejecuta **sujeto a la RLS de quien consulta**. Como `workshop_members` solo deja ver membresías propias (o todas, si es `owner`), un `mechanic` o `advisor` no vería a sus compañeros. El helper `SECURITY DEFINER` evita esa restricción.

---

## Helper 7: `auth_owner_invited(p_user_id uuid)`

Devuelve `true` si `p_user_id` tiene una membresía `invited` en un taller del que el usuario autenticado es `owner`.

```sql
CREATE OR REPLACE FUNCTION auth_owner_invited(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM workshop_members wm
     WHERE wm.user_id = p_user_id
       AND wm.status = 'invited'
       AND auth_is_owner_in(wm.workshop_id)
  );
$$;
```

**Uso típico**: `USING (auth_owner_invited(id))` en `users`. Existe porque `auth_shares_workshop_with` exige que ambos estén `active`, y el `owner` necesita ver nombre, correo y teléfono de un invitado para listarlo en "Equipo".

---

## Permisos de ejecución

Las migraciones revocan `EXECUTE` a `PUBLIC` y `anon`, y lo conceden solo a `authenticated`. Los helpers dependen de `auth.uid()`, que es `NULL` para `anon`, así que no devolverían nada útil; así no quedan expuestos como RPC anónimos de PostgREST.

---

## Resumen

| Función                                    | Retorna   | Uso                           |
| ------------------------------------------ | --------- | ----------------------------- |
| `auth_workshop_ids()`                      | `uuid[]`  | Filtro multi-tenant           |
| `auth_role_in(workshop_id)`                | `text`    | Rol del usuario en un taller  |
| `auth_is_owner_in(workshop_id)`            | `boolean` | ¿Es owner?                    |
| `auth_is_advisor_or_owner_in(workshop_id)` | `boolean` | ¿Es owner o advisor?          |
| `auth_is_mechanic_in(workshop_id)`         | `boolean` | ¿Es mechanic?                 |
| `auth_shares_workshop_with(user_id)`       | `boolean` | ¿Comparten taller activo?     |
| `auth_owner_invited(user_id)`              | `boolean` | ¿Es un invitado de mi taller? |

---

## Notas sobre performance

- **`STABLE`**: PostgreSQL puede cachear el resultado dentro de una transacción. Importante cuando una query toca múltiples tablas y llama al helper varias veces.
- **`SECURITY DEFINER`**: la función corre con permisos del owner. No requiere que el usuario tenga `SELECT` sobre `workshop_members`.
- **`SET search_path = public`**: previene ataques de search_path. **Obligatorio** en funciones `SECURITY DEFINER`.

---

## Referencias

- [README de security](./README.md)
- [Decisiones transversales](./decisions.md)
- [Policies](./policies/README.md)

---

_Funciones Helper v1.1_
