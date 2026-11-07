-- Datos de desarrollo y de integration tests. Se aplica con `supabase db reset`.
-- NO usar en producción: contraseña conocida y UUIDs fijos.
--
-- Talleres:  A = 'Taller A' (owner, advisor, mechanic)   B = 'Taller B' (owner, advisor)
-- Contraseña de todos los usuarios: password123

-- Talleres (INSERT solo vía service_role / migración: sin policy para authenticated)
INSERT INTO workshops (id, name, address, phone) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Taller A', 'Av. Principal 123, Quito',  '0999000001'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Taller B', 'Calle Secundaria 45, Cuenca', '0999000002');

-- Usuarios de Auth. El trigger handle_new_auth_user crea la fila de public.users.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
SELECT
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  crypt('password123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name),
  now(), now(), '', '', '', ''
FROM (VALUES
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'owner@workshop-a.com',    'Olga Owner A'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'advisor@workshop-a.com',  'Ana Advisor A'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'mechanic@workshop-a.com', 'Mario Mechanic A'),
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'owner@workshop-b.com',    'Oscar Owner B'),
  ('b0000000-0000-4000-8000-000000000002'::uuid, 'advisor@workshop-b.com',  'Berta Advisor B')
) AS u(id, email, full_name);

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(), id, id::text,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now()
FROM auth.users;

-- Membresías
INSERT INTO workshop_members (workshop_id, user_id, role, status, joined_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a0000000-0000-4000-8000-000000000001', 'owner',    'active', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a0000000-0000-4000-8000-000000000002', 'advisor',  'active', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a0000000-0000-4000-8000-000000000003', 'mechanic', 'active', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000001', 'owner',    'active', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002', 'advisor',  'active', now());

-- ---------------------------------------------------------------------------
-- Datos de negocio (UUIDs fijos, ver src/testing/utils/seed-ids.ts).
-- Taller A: cadena completa (cliente → orden → cotización → foto).
-- Taller B: lo mínimo para probar el aislamiento entre talleres.
-- Las órdenes nacen con numeración de 2025 para que los tests de numeración
-- (año en curso) empiecen en 0001.
-- ---------------------------------------------------------------------------
INSERT INTO customers (id, workshop_id, first_name, last_name, phone, email, identification, address) VALUES
  ('ca000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Carlos', 'Cliente', '0991000001', 'carlos@example.com', '1700000001', 'Calle 1, Quito'),
  ('ca000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Carla',  'Compradora', '0991000002', NULL, NULL, NULL),
  ('cb000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Bruno',  'Cliente B', '0992000001', 'bruno@example.com', '0100000001', 'Calle 2, Cuenca');

INSERT INTO vehicles (id, workshop_id, license_plate, make, model, year, color, transmission) VALUES
  ('fa000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'PBA-1234', 'Chevrolet', 'Spark', 2018, 'Rojo', 'manual'),
  ('fa000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'PBA-5678', 'Kia', 'Rio', 2020, 'Gris', 'automatic'),
  ('fb000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'ABC-0001', 'Toyota', 'Yaris', 2019, 'Blanco', 'manual');

INSERT INTO vehicle_ownerships (id, workshop_id, vehicle_id, customer_id) VALUES
  ('0a000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'fa000000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000001'),
  ('0b000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'fb000000-0000-4000-8000-000000000001', 'cb000000-0000-4000-8000-000000000001');

INSERT INTO work_orders (
  id, workshop_id, customer_id, vehicle_id, advisor_id,
  sequence_number, sequence_year, sequence_number_annual, status, reported_problem, received_at
) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'ca000000-0000-4000-8000-000000000001', 'fa000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000002',
   'OT-2025-0001', 2025, 1, 'inspecting', 'Ruido al frenar', now()),
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'cb000000-0000-4000-8000-000000000001', 'fb000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000002',
   'OT-2025-0001', 2025, 1, 'inspecting', 'No enciende', now());

INSERT INTO work_iterations (id, workshop_id, work_order_id, iteration_number) VALUES
  ('a2000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1000000-0000-4000-8000-000000000001', 1),
  ('b2000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b1000000-0000-4000-8000-000000000001', 1);

INSERT INTO inspections (id, workshop_id, work_iteration_id, mechanic_id, notes) VALUES
  ('a3000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'Revisión de frenos');

INSERT INTO findings (id, workshop_id, inspection_id, created_by, description) VALUES
  ('a4000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'Pastillas desgastadas');

INSERT INTO diagnoses (id, workshop_id, finding_id, created_by, description) VALUES
  ('a5000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'Cambiar pastillas delanteras');

INSERT INTO recommended_repairs (id, workshop_id, work_iteration_id, created_by, description, estimated_cost) VALUES
  ('a6000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'Cambio de pastillas', 60.00),
  ('b6000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Revisar batería', 30.00);

INSERT INTO repair_findings (recommended_repair_id, finding_id) VALUES
  ('a6000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001');

INSERT INTO items_catalog (id, workshop_id, type, name, code, default_cost) VALUES
  ('a7000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'part', 'Pastillas de freno', 'PF-001', 35.00),
  ('b7000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'part', 'Batería 12V', 'BT-001', 90.00);

INSERT INTO suppliers (id, workshop_id, name, phone) VALUES
  ('a8000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Repuestos Quito', '022000001'),
  ('b8000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Repuestos Cuenca', '072000001');

INSERT INTO repair_items (id, workshop_id, recommended_repair_id, item_catalog_id, supplier_id, type, name, quantity, estimated_cost) VALUES
  ('a9000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'a6000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001',
   'a8000000-0000-4000-8000-000000000001', 'part', 'Pastillas de freno', 1, 35.00);

INSERT INTO quotes (id, workshop_id, work_iteration_id, created_by, total_amount, expires_at) VALUES
  ('aa000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 60.00, now() + interval '7 days'),
  ('ba000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 30.00, now() + interval '7 days');

INSERT INTO quote_items (id, quote_id, item_catalog_id, type, name, quantity, unit_cost, total_cost) VALUES
  ('ab000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-000000000001',
   'a7000000-0000-4000-8000-000000000001', 'part', 'Pastillas de freno', 1, 35.00, 35.00),
  ('bb000000-0000-4000-8000-000000000001', 'ba000000-0000-4000-8000-000000000001',
   'b7000000-0000-4000-8000-000000000001', 'part', 'Batería 12V', 1, 90.00, 90.00);

INSERT INTO photos (id, workshop_id, uploaded_by, entity_type, entity_id, storage_path, mime_type, size_bytes) VALUES
  ('ac000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'a0000000-0000-4000-8000-000000000003', 'finding', 'a4000000-0000-4000-8000-000000000001',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/finding/a4000000-0000-4000-8000-000000000001/seed.jpg', 'image/jpeg', 120000);
