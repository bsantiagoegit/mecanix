-- Logo del taller: bucket público `logos`, policies de escritura para el owner y
-- validación de workshops.logo_url.
-- Fuente: docs/architecture/adr/ADR-014, docs/architecture/storage/{buckets,policies,paths}.md.

-- logo_url guarda la URL pública completa: solo http(s) y de longitud acotada.
ALTER TABLE workshops
  ADD CONSTRAINT workshops_logo_url_valid CHECK (
    logo_url IS NULL OR (logo_url ~ '^https?://' AND length(logo_url) <= 2048)
  );

-- ---------------------------------------------------------------------------
-- Storage. El esquema `storage` lo crea el contenedor storage-api; si no está
-- (p. ej. CI con el stack mínimo) se omite el bucket y sus policies.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'storage no disponible: se omite el bucket logos y sus policies';
    RETURN;
  END IF;

  -- Público: la URL pública se sirve sin pasar por RLS. 1 MB; sin SVG (puede llevar scripts).
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('logos', 'logos', true, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp'])
  ON CONFLICT (id) DO NOTHING;

  -- Solo el owner (activo) del taller del primer segmento del path sube y elimina.
  -- Sin UPDATE: cada subida es un archivo nuevo con su propio UUID.
  CREATE POLICY logos_select_owner ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'logos'
      AND auth_is_owner_in(((storage.foldername(name))[1])::uuid)
    );

  CREATE POLICY logos_insert_owner ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'logos'
      AND auth_is_owner_in(((storage.foldername(name))[1])::uuid)
    );

  CREATE POLICY logos_delete_owner ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'logos'
      AND auth_is_owner_in(((storage.foldername(name))[1])::uuid)
    );
END
$$;
