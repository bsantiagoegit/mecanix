[← Índice de tablas](./README.md)

# Fotos

### 26. `photos`

Evidencia fotográfica. Relación polimórfica.

```sql
CREATE TABLE photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id   uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  uploaded_by   uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  entity_type   text NOT NULL,
  entity_id     uuid NOT NULL,
  storage_path  text NOT NULL,
  mime_type     text NOT NULL,
  size_bytes    int NOT NULL,
  width         int,
  height        int,
  caption       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT photos_entity_type_valid CHECK (
    entity_type IN ('intake', 'finding', 'diagnosis', 'repair', 'work_order')
  ),
  CONSTRAINT photos_size_positive CHECK (size_bytes > 0),
  CONSTRAINT photos_mime_valid CHECK (
    mime_type IN ('image/jpeg', 'image/png', 'image/webp')
  )
);

CREATE INDEX idx_photos_entity ON photos(entity_type, entity_id);
CREATE INDEX idx_photos_workshop ON photos(workshop_id);
CREATE INDEX idx_photos_uploaded_by ON photos(uploaded_by);
```

**Relación polimórfica**: `entity_type` + `entity_id`. Sin FK real. Se valida con CHECK.
