[← Índice de policies](./README.md)

# Items y cotizaciones

### `quotes`

```sql
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotes_select_advisor_owner ON quotes
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY quotes_insert_advisor_owner ON quotes
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id) AND created_by = auth.uid());

CREATE POLICY quotes_update_advisor_owner ON quotes
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));
```

### `quote_items`

```sql
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY quote_items_select_advisor_owner ON quote_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
       WHERE q.id = quote_items.quote_id
         AND q.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_advisor_or_owner_in(q.workshop_id)
    )
  );

CREATE POLICY quote_items_insert_advisor_owner ON quote_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes q
       WHERE q.id = quote_items.quote_id
         AND q.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_advisor_or_owner_in(q.workshop_id)
    )
  );

CREATE POLICY quote_items_update_advisor_owner ON quote_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
       WHERE q.id = quote_items.quote_id
         AND q.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_advisor_or_owner_in(q.workshop_id)
    )
  );

CREATE POLICY quote_items_delete_advisor_owner ON quote_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
       WHERE q.id = quote_items.quote_id
         AND q.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_advisor_or_owner_in(q.workshop_id)
    )
  );
```

### `repair_items`

```sql
ALTER TABLE repair_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY repair_items_select_member ON repair_items
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY repair_items_insert_member ON repair_items
  FOR INSERT TO authenticated
  WITH CHECK (
    workshop_id = ANY(auth_workshop_ids())
    AND (auth_is_mechanic_in(workshop_id) OR auth_is_advisor_or_owner_in(workshop_id))
  );

CREATE POLICY repair_items_update_member ON repair_items
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));
```

### `items_catalog`

```sql
ALTER TABLE items_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_catalog_select_member ON items_catalog
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY items_catalog_insert_advisor_owner ON items_catalog
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY items_catalog_update_advisor_owner ON items_catalog
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY items_catalog_delete_advisor_owner ON items_catalog
  FOR DELETE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id));
```

### `suppliers`

```sql
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_select_member ON suppliers
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY suppliers_insert_advisor_owner ON suppliers
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY suppliers_update_advisor_owner ON suppliers
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY suppliers_delete_advisor_owner ON suppliers
  FOR DELETE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id));
```
