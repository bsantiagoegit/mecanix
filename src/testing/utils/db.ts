import { Client } from 'pg';

const CONNECTION_STRING = 'postgresql://postgres:postgres@localhost:54322/postgres';

/** Conexión como `postgres` (bypassa RLS). Para preparar y verificar datos. */
export async function connectAsAdmin(): Promise<Client> {
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();
  return client;
}

/**
 * Conexión que se comporta como el usuario `email` autenticado: fija los
 * claims del JWT (de ahí lee `auth.uid()`) y cambia al rol `authenticated`,
 * por lo que RLS aplica. El rol no se puede revertir en la misma conexión.
 */
export async function connectAs(email: string): Promise<Client> {
  const admin = await connectAsAdmin();
  const { rows } = await admin.query<{ id: string }>('SELECT id FROM auth.users WHERE email = $1', [
    email,
  ]);
  await admin.end();

  if (rows.length === 0) {
    throw new Error(`Usuario de prueba no encontrado: ${email}. ¿Corriste "supabase db reset"?`);
  }
  const userId = rows[0].id;

  const client = await connectAsAdmin();
  const claims = JSON.stringify({ sub: userId, role: 'authenticated' });
  await client.query(`SELECT set_config('request.jwt.claims', $1, false)`, [claims]);
  await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId]);
  await client.query('SET ROLE authenticated');
  return client;
}

/**
 * Ejecuta `fn` dentro de una transacción que siempre se revierte, para tests
 * que mutan datos sin contaminar el seed.
 */
export async function withRollback<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  await client.query('BEGIN');
  try {
    return await fn();
  } finally {
    await client.query('ROLLBACK');
  }
}
