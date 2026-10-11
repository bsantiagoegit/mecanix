# Policies: Reparaciones

**Tablas**: `recommended_repairs`, `repair_findings`, `approvals`, `performed_repairs`, `labor_entries`

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## `recommended_repairs`

**Regla**: cualquier miembro ve. Solo `mechanic` crea. `advisor` y `owner` modifican el `status` (al aprobar/rechazar). Pero la aprobación se registra en `approvals`, así que `recommended_repairs.status` se actualiza desde RPC.

```sql
ALTER TABLE recommended_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY recommended_repairs_select_member ON recommended_repairs
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY recommended_repairs_insert_mechanic ON recommended_repairs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_mechanic_in(workshop_id) AND created_by = auth.uid());

CREATE POLICY recommended_repairs_update_member ON recommended_repairs
  FOR UPDATE
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

-- Sin DELETE.
```

---

## `repair_findings`

**Regla**: sin `workshop_id`. Se valida vía `EXISTS` con `recommended_repairs`.

```sql
ALTER TABLE repair_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY repair_findings_select_member ON repair_findings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recommended_repairs rr
       WHERE rr.id = repair_findings.recommended_repair_id
         AND rr.workshop_id = ANY(auth_workshop_ids())
    )
  );

CREATE POLICY repair_findings_insert_mechanic ON repair_findings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recommended_repairs rr
       WHERE rr.id = repair_findings.recommended_repair_id
         AND rr.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_mechanic_in(rr.workshop_id)
    )
  );

-- Sin UPDATE, sin DELETE. La tabla es append-only.
```

**Nota**: tabla derivada sin `workshop_id`. Policy usa `EXISTS` con JOIN a `recommended_repairs` (decisión D-RLS-06).

---

## `approvals`

**Regla**: cualquier miembro ve. Solo `advisor` y `owner` crean (registran la decisión del cliente).

```sql
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY approvals_select_member ON approvals
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY approvals_insert_advisor_owner ON approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id) AND approved_by = auth.uid());

-- Sin UPDATE, sin DELETE. Es histórico.
```

---

## `performed_repairs`

**Regla**: cualquier miembro ve. Solo `mechanic` crea y modifica.

```sql
ALTER TABLE performed_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY performed_repairs_select_member ON performed_repairs
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY performed_repairs_insert_mechanic ON performed_repairs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_mechanic_in(workshop_id) AND mechanic_id = auth.uid());

CREATE POLICY performed_repairs_update_mechanic ON performed_repairs
  FOR UPDATE
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_mechanic_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

-- Sin DELETE.
```

---

## `labor_entries`

**Regla**: cualquier miembro ve. Solo `mechanic` crea. Sin `UPDATE` ni `DELETE` (es histórico).

```sql
ALTER TABLE labor_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY labor_entries_select_member ON labor_entries
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY labor_entries_insert_mechanic ON labor_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_mechanic_in(workshop_id) AND mechanic_id = auth.uid());

-- Sin UPDATE, sin DELETE.
```

---

## Referencias

- [README de policies](./README.md)
- [Decisiones transversales](../decisions.md)
- [Helpers](../helpers.md)
- [Tablas: Reparaciones](../../data-model/tables/05-repairs.md)

---

_Policies de Reparaciones v1.0_
