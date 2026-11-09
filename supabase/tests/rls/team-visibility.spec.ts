import { Client } from 'pg';
import {
  actAsAdmin,
  actAsUser,
  connectAsAdmin,
  createAuthUser,
  withRollback,
} from '../../../src/testing/utils/db';
import {
  USER_ADVISOR_A,
  USER_OWNER_A,
  USER_OWNER_B,
  WORKSHOP_A,
} from '../../../src/testing/utils/seed-ids';

describe('Equipo: visibilidad del perfil de los invitados', () => {
  let admin: Client;

  beforeAll(async () => {
    admin = await connectAsAdmin();
  });

  afterAll(async () => {
    await admin?.end();
  });

  /** Crea un usuario con membresía en el taller A con el estado dado. */
  async function member(email: string, status: 'invited' | 'active' | 'inactive') {
    const id = await createAuthUser(admin, email);
    await admin.query(
      `INSERT INTO workshop_members (workshop_id, user_id, role, status) VALUES ($1, $2, 'advisor', $3)`,
      [WORKSHOP_A, id, status],
    );
    return id;
  }

  const canSee = async (id: string) =>
    (await admin.query(`SELECT 1 FROM users WHERE id = $1`, [id])).rowCount === 1;

  it('el owner ve el perfil de un invitado de su taller', async () => {
    await withRollback(admin, async () => {
      const id = await member('invitado@example.com', 'invited');
      await actAsUser(admin, USER_OWNER_A);
      expect(await canSee(id)).toBe(true);
    });
  });

  it('el owner de otro taller no ve al invitado', async () => {
    await withRollback(admin, async () => {
      const id = await member('invitado@example.com', 'invited');
      await actAsUser(admin, USER_OWNER_B);
      expect(await canSee(id)).toBe(false);
    });
  });

  it('un advisor del mismo taller no ve al invitado', async () => {
    await withRollback(admin, async () => {
      const id = await member('invitado@example.com', 'invited');
      await actAsUser(admin, USER_ADVISOR_A);
      expect(await canSee(id)).toBe(false);
    });
  });

  it('al cancelar la invitación (inactive) el owner deja de ver el perfil', async () => {
    await withRollback(admin, async () => {
      const id = await member('invitado@example.com', 'invited');
      await admin.query(`UPDATE workshop_members SET status = 'inactive' WHERE user_id = $1`, [id]);
      await actAsUser(admin, USER_OWNER_A);
      expect(await canSee(id)).toBe(false);
    });
  });

  it('un invitado no gana acceso a nadie más por estar invitado', async () => {
    await withRollback(admin, async () => {
      const id = await member('invitado@example.com', 'invited');
      await actAsUser(admin, id);
      const { rows } = await admin.query(`SELECT id FROM users`);
      expect(rows.map((r) => r.id)).toEqual([id]);
      await actAsAdmin(admin);
    });
  });
});
