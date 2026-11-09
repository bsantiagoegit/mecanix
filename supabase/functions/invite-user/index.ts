// Edge Function `invite-user` (ADR-013, UC-WS-03).
// El owner invita a un asesor o mecánico: Supabase Auth envía el correo y la
// membresía queda en `invited`. Contrato en
// docs/architecture/multi-tenant/workshop-onboarding.md.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ROLES = ['advisor', 'mechanic'] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function fail(status: number, code: string): Response {
  return respond(status, { error: code });
}

interface InviteInput {
  email: string;
  fullName: string;
  phone: string;
  role: (typeof ALLOWED_ROLES)[number];
}

function parseInput(raw: unknown): InviteInput | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { email, fullName, phone, role } = raw as Record<string, unknown>;
  if (typeof email !== 'string' || typeof fullName !== 'string' || typeof phone !== 'string') {
    return null;
  }
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();
  const cleanPhone = phone.trim();
  if (!EMAIL_PATTERN.test(cleanEmail) || cleanName === '' || cleanPhone === '') return null;
  if (!ALLOWED_ROLES.includes(role as InviteInput['role'])) return null;
  return {
    email: cleanEmail,
    fullName: cleanName,
    phone: cleanPhone,
    role: role as InviteInput['role'],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return fail(405, 'method_not_allowed');

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const appUrl = Deno.env.get('APP_URL');
  if (!url || !serviceKey || !appUrl) return fail(500, 'misconfigured');

  // 1. Sesión: el token se valida contra Auth; nada del cuerpo decide el taller.
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return fail(401, 'not_authenticated');

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller.user) return fail(401, 'not_authenticated');

  // 2. Quien invita es owner activo; su taller sale de la membresía.
  const { data: membership } = await admin
    .from('workshop_members')
    .select('workshop_id')
    .eq('user_id', caller.user.id)
    .eq('role', 'owner')
    .eq('status', 'active')
    .maybeSingle();
  if (!membership) return fail(403, 'not_owner');

  // 3. Datos.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(422, 'invalid_input');
  }
  const input = parseInput(body);
  if (!input) return fail(422, 'invalid_input');

  // 4. Invitación. Un correo con cuenta se rechaza (MVP): Auth responde `email_exists`.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    input.email,
    {
      data: { full_name: input.fullName, phone: input.phone },
      redirectTo: `${appUrl.replace(/\/$/, '')}/auth/accept-invitation`,
    },
  );
  if (inviteError || !invited.user) {
    const registered =
      inviteError?.code === 'email_exists' ||
      /already.*registered/i.test(inviteError?.message ?? '');
    return registered ? fail(409, 'email_already_registered') : fail(500, 'invitation_failed');
  }

  // 5. Membresía `invited`. Si falla, no se deja una cuenta huérfana.
  const { error: memberError } = await admin.from('workshop_members').insert({
    workshop_id: membership.workshop_id,
    user_id: invited.user.id,
    role: input.role,
    status: 'invited',
    invited_at: new Date().toISOString(),
  });
  if (memberError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    return fail(500, 'invitation_failed');
  }

  return respond(201, { userId: invited.user.id, email: input.email, role: input.role });
});
