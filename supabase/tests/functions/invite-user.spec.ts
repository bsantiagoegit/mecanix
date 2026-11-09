import { Client } from 'pg';
import { environment } from '../../../src/environments/environment';
import { connectAsAdmin } from '../../../src/testing/utils/db';
import { WORKSHOP_A } from '../../../src/testing/utils/seed-ids';

const API = environment.supabaseUrl;
const KEY = environment.supabaseAnonKey;
const MAILPIT = 'http://127.0.0.1:54324';

describe('Edge Function invite-user (requiere edge-runtime: supabase functions serve)', () => {
  let admin: Client;
  let available = false;
  const tokens: Record<string, string> = {};
  const created: string[] = [];

  const signIn = async (email: string) => {
    const res = await fetch(`${API}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    });
    return ((await res.json()) as { access_token: string }).access_token;
  };

  const invite = (token: string | null, body: unknown) =>
    fetch(`${API}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

  const unique = () => `invitee-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const valid = (email: string, role = 'advisor') => ({
    email,
    fullName: 'Persona Invitada',
    phone: '0991112233',
    role,
  });

  const membershipOf = async (email: string) => {
    const { rows } = await admin.query(
      `SELECT m.workshop_id, m.role, m.status, m.invited_at, u.full_name, u.phone
         FROM workshop_members m JOIN users u ON u.id = m.user_id WHERE u.email = $1`,
      [email],
    );
    return rows;
  };

  beforeAll(async () => {
    admin = await connectAsAdmin();
    try {
      // Con edge-runtime caído el gateway responde 5xx o corta la conexión.
      const probe = await fetch(`${API}/functions/v1/invite-user`, { method: 'OPTIONS' });
      available = probe.status < 500;
      if (!available) return;
      tokens['ownerA'] = await signIn('owner@workshop-a.com');
      tokens['ownerB'] = await signIn('owner@workshop-b.com');
      tokens['advisorA'] = await signIn('advisor@workshop-a.com');
    } catch {
      available = false;
    }
  });

  afterAll(async () => {
    // Solo las cuentas creadas por esta suite, por correo exacto.
    for (const email of created) {
      await admin.query(
        `DELETE FROM workshop_members WHERE user_id IN (SELECT id FROM auth.users WHERE email = $1)`,
        [email],
      );
      await admin.query(`DELETE FROM auth.users WHERE email = $1`, [email]);
    }
    await admin?.end();
  });

  it('rechaza una petición sin sesión (401)', async (ctx) => {
    if (!available) return ctx.skip();
    expect((await invite(null, valid(unique()))).status).toBe(401);
  });

  it('rechaza un token inválido (401)', async (ctx) => {
    if (!available) return ctx.skip();
    expect((await invite('no-es-un-jwt', valid(unique()))).status).toBe(401);
  });

  it('un advisor no invita (403) y no se crea nada', async (ctx) => {
    if (!available) return ctx.skip();
    const email = unique();
    const res = await invite(tokens['advisorA'], valid(email));
    expect(res.status).toBe(403);
    expect(await membershipOf(email)).toEqual([]);
  });

  const invalidCases: [string, Record<string, string>][] = [
    ['un correo mal formado', { email: 'sin-arroba' }],
    ['un nombre vacío', { fullName: '  ' }],
    ['un teléfono vacío', { phone: '' }],
    ['el rol owner', { role: 'owner' }],
    ['un rol inventado', { role: 'admin' }],
  ];
  for (const [label, override] of invalidCases) {
    it(`rechaza ${label} (422)`, async (ctx) => {
      if (!available) return ctx.skip();
      const email = unique();
      const res = await invite(tokens['ownerA'], { ...valid(email), ...override });
      expect(res.status).toBe(422);
      expect(await membershipOf(email)).toEqual([]);
    });
  }

  it('rechaza un correo que ya tiene cuenta (409)', async (ctx) => {
    if (!available) return ctx.skip();
    const res = await invite(tokens['ownerA'], valid('advisor@workshop-a.com'));
    expect(res.status).toBe(409);
  });

  it('el owner invita: crea la membresía invited en SU taller y envía el correo', async (ctx) => {
    if (!available) return ctx.skip();
    const email = unique();
    created.push(email);
    const res = await invite(tokens['ownerA'], valid(email, 'mechanic'));
    expect(res.status).toBe(201);

    const rows = await membershipOf(email);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      workshop_id: WORKSHOP_A,
      role: 'mechanic',
      status: 'invited',
      full_name: 'Persona Invitada',
      phone: '0991112233',
    });
    expect(rows[0].invited_at).not.toBeNull();

    const mail = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
      .then((r) => r.json() as Promise<{ messages: { Subject: string }[] }>)
      .catch(() => null);
    if (mail) expect(mail.messages[0]?.Subject).toContain('Te invitaron');
  });

  it('ignora un workshop_id del cuerpo: el taller sale de la membresía del owner', async (ctx) => {
    if (!available) return ctx.skip();
    const email = unique();
    created.push(email);
    const otherWorkshop = (
      await admin.query(`SELECT id FROM workshops WHERE id <> $1 LIMIT 1`, [WORKSHOP_A])
    ).rows[0].id;
    const res = await invite(tokens['ownerA'], { ...valid(email), workshopId: otherWorkshop });
    expect(res.status).toBe(201);
    expect((await membershipOf(email))[0].workshop_id).toBe(WORKSHOP_A);
  });

  it('el owner de otro taller invita al suyo, no al de A', async (ctx) => {
    if (!available) return ctx.skip();
    const email = unique();
    created.push(email);
    expect((await invite(tokens['ownerB'], valid(email))).status).toBe(201);
    expect((await membershipOf(email))[0].workshop_id).not.toBe(WORKSHOP_A);
  });

  it('responde al preflight CORS', async (ctx) => {
    if (!available) return ctx.skip();
    const res = await fetch(`${API}/functions/v1/invite-user`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-headers')).toContain('authorization');
  });
});
