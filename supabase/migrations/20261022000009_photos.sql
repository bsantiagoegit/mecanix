-- 08-photos: tabla, policies, bucket privado y policies de Storage.
-- Fuente: docs/architecture/data-model/tables/08-photos.md,
--         docs/architecture/security/policies/08-photos.md y
--         docs/architecture/storage/{buckets,policies}.md.

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

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY photos_select_member ON photos
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY photos_insert_member ON photos
  FOR INSERT TO authenticated
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()) AND uploaded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: bucket privado `photos` y sus policies.
-- El esquema `storage` lo crea el contenedor storage-api. Si no está
-- (p. ej. CI con el stack mínimo) se omite; el resto de la migración aplica.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'storage no disponible: se omite el bucket photos y sus policies';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('photos', 'photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
  ON CONFLICT (id) DO NOTHING;

  CREATE POLICY photos_select_member ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'photos'
      AND (storage.foldername(name))[1]::uuid = ANY(auth_workshop_ids())
    );

  CREATE POLICY photos_insert_member ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'photos'
      AND (storage.foldername(name))[1]::uuid = ANY(auth_workshop_ids())
    );
END
$$;
