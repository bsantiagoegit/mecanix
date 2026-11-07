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
