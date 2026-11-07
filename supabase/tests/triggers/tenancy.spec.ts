import { Client } from 'pg';
import { connectAsAdmin, withRollback } from '../../../src/testing/utils/db';
import { USER_OWNER_A } from '../../../src/testing/utils/seed-ids';

describe('Triggers: tenancy', () => {
  let admin: Client;

  beforeAll(async () => {
    admin = await connectAsAdmin();
  });

  afterAll(async () => {
    await admin?.end();
  });

  describe('handle_new_auth_user', () => {
    it('crea la fila de users con full_name y phone del metadata', async () => {
      await withRollback(admin, async () => {
        const { rows } = await admin.query<{ id: string }>(
          `INSERT INTO auth.users (id, email, raw_user_meta_data)
           VALUES (gen_random_uuid(), 'nuevo@taller.com',
                   '{"full_name":"Nuevo Usuario","phone":"0987654321"}'::jsonb)
           RETURNING id`,
        );
        const profile = await admin.query(`SELECT * FROM users WHERE id = $1`, [rows[0].id]);
        expect(profile.rows[0]).toMatchObject({
          email: 'nuevo@taller.com',
          full_name: 'Nuevo Usuario',
          phone: '0987654321',
        });
      });
    });

    it('usa la parte local del email si no hay full_name', async () => {
      await withRollback(admin, async () => {
        const { rows } = await admin.query<{ id: string }>(
          `INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'sin.nombre@taller.com')
           RETURNING id`,
        );
        const profile = await admin.query(`SELECT full_name, phone FROM users WHERE id = $1`, [
          rows[0].id,
        ]);
        expect(profile.rows[0]).toEqual({ full_name: 'sin.nombre', phone: null });
      });
    });

    it('eliminar el usuario de auth elimina su perfil (CASCADE)', async () => {
      await withRollback(admin, async () => {
        const { rows } = await admin.query<{ id: string }>(
          `INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'borrar@taller.com')
           RETURNING id`,
        );
        await admin.query(`DELETE FROM auth.users WHERE id = $1`, [rows[0].id]);
        const profile = await admin.query(`SELECT 1 FROM users WHERE id = $1`, [rows[0].id]);
        expect(profile.rowCount).toBe(0);
      });
    });
  });

  describe('set_updated_at', () => {
    it('actualiza updated_at en users al modificar la fila', async () => {
      const before = await admin.query(`SELECT updated_at FROM users WHERE id = $1`, [
        USER_OWNER_A,
      ]);
      try {
        await admin.query(`UPDATE users SET phone = '0911111111' WHERE id = $1`, [USER_OWNER_A]);
        const after = await admin.query(`SELECT updated_at FROM users WHERE id = $1`, [
          USER_OWNER_A,
        ]);
        expect(after.rows[0].updated_at.getTime()).toBeGreaterThan(
          before.rows[0].updated_at.getTime(),
        );
      } finally {
        await admin.query(`UPDATE users SET phone = NULL WHERE id = $1`, [USER_OWNER_A]);
      }
    });
  });
});
