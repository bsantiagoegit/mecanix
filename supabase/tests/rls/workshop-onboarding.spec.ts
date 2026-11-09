import { Client } from 'pg';
import {
  actAsAdmin,
  actAsUser,
  connectAsAdmin,
  createAuthUser,
  withRollback,
} from '../../../src/testing/utils/db';
import { USER_OWNER_A, WORKSHOP_A } from '../../../src/testing/utils/seed-ids';

const RLS_VIOLATION = /row-level security|policy/i;

describe('Onboarding de taller: create_workshop, accept_invitation y membresías', () => {
  let admin: Client;

  beforeAll(async () => {
    admin = await connectAsAdmin();
  });

  afterAll(async () => {
    await admin?.end();
  });

  const create = (name = 'Taller Nuevo', address = 'Calle 1', phone = '0990000000') =>
    admin.query<{ id: string }>(`SELECT create_workshop($1, $2, $3) AS id`, [name, address, phone]);

  /** Usuario nuevo sin taller, actuando como él dentro de la transacción en curso. */
  async function newUser(email = 'nuevo@example.com', confirmed = true) {
    const id = await createAuthUser(admin, email, { confirmed });
    await actAsUser(admin, id);
    return id;
  }

  describe('create_workshop', () => {
    it('crea el taller y deja al usuario como owner activo', async () => {
      await withRollback(admin, async () => {
        const userId = await newUser();
        const { rows } = await create('  Mi Taller  ', ' Av. 10 ', ' 099 ');
        const workshopId = rows[0].id;

        const workshop = await admin.query(
          `SELECT name, address, phone FROM workshops WHERE id = $1`,
          [workshopId],
        );
        expect(workshop.rows[0]).toEqual({ name: 'Mi Taller', address: 'Av. 10', phone: '099' });

        const member = await admin.query(
          `SELECT role, status, joined_at FROM workshop_members WHERE workshop_id = $1 AND user_id = $2`,
          [workshopId, userId],
        );
        expect(member.rows[0]).toMatchObject({ role: 'owner', status: 'active' });
        expect(member.rows[0].joined_at).not.toBeNull();
      });
    });

    it('usa los valores por defecto del taller', async () => {
      await withRollback(admin, async () => {
        await newUser();
        const { rows } = await create();
        const w = await admin.query(
          `SELECT capacity, min_intake_photos, quote_expiration_days, warranty_days, currency, timezone
             FROM workshops WHERE id = $1`,
          [rows[0].id],
        );
        expect(w.rows[0]).toEqual({
          capacity: 4,
          min_intake_photos: 4,
          quote_expiration_days: 7,
          warranty_days: 14,
          currency: 'USD',
          timezone: 'America/Guayaquil',
        });
      });
    });

    it('el nuevo owner ve su taller por RLS y no el de otros', async () => {
      await withRollback(admin, async () => {
        await newUser();
        const { rows } = await create();
        const visible = await admin.query(`SELECT id FROM workshops`);
        expect(visible.rows.map((r) => r.id)).toEqual([rows[0].id]);
      });
    });

    it('rechaza un segundo taller para la misma cuenta', async () => {
      await withRollback(admin, async () => {
        await newUser();
        await create();
        await expect(create('Otro')).rejects.toThrow(/user_already_has_workshop/);
      });
    });

    it('rechaza a quien ya pertenece a un taller (owner del seed)', async () => {
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_OWNER_A);
        await expect(create()).rejects.toThrow(/user_already_has_workshop/);
      });
    });

    it('rechaza a quien tiene una invitación pendiente', async () => {
      await withRollback(admin, async () => {
        const id = await createAuthUser(admin, 'invitado@example.com');
        await admin.query(
          `INSERT INTO workshop_members (workshop_id, user_id, role, status) VALUES ($1, $2, 'mechanic', 'invited')`,
          [WORKSHOP_A, id],
        );
        await actAsUser(admin, id);
        await expect(create()).rejects.toThrow(/user_already_has_workshop/);
      });
    });

    it('permite crear un taller a quien fue desactivado de otro', async () => {
      await withRollback(admin, async () => {
        const id = await createAuthUser(admin, 'exmiembro@example.com');
        await admin.query(
          `INSERT INTO workshop_members (workshop_id, user_id, role, status) VALUES ($1, $2, 'mechanic', 'inactive')`,
          [WORKSHOP_A, id],
        );
        await actAsUser(admin, id);
        expect((await create()).rows[0].id).toBeTruthy();
      });
    });

    it('rechaza al usuario con el correo sin confirmar', async () => {
      await withRollback(admin, async () => {
        await newUser('sinconfirmar@example.com', false);
        await expect(create()).rejects.toThrow(/email_not_confirmed/);
      });
    });

    it.each([
      ['nombre vacío', ['', 'Calle', '099']],
      ['dirección en blanco', ['Taller', '   ', '099']],
      ['teléfono vacío', ['Taller', 'Calle', '']],
    ])('rechaza datos inválidos: %s', async (_label, [name, address, phone]) => {
      await withRollback(admin, async () => {
        await newUser();
        await expect(create(name, address, phone)).rejects.toThrow(/invalid_workshop_data/);
      });
    });

    it('no deja un taller huérfano si falla', async () => {
      await withRollback(admin, async () => {
        await newUser();
        await create();
        await admin.query('SAVEPOINT s');
        await expect(create('Otro')).rejects.toThrow();
        await admin.query('ROLLBACK TO SAVEPOINT s');
        await actAsAdmin(admin);
        const { rows } = await admin.query(
          `SELECT count(*)::int AS n FROM workshops WHERE name = 'Otro'`,
        );
        expect(rows[0].n).toBe(0);
      });
    });

    it('no se ejecuta sin sesión (anon) ni sin usuario', async () => {
      await withRollback(admin, async () => {
        await admin.query('SET LOCAL ROLE anon');
        await expect(create()).rejects.toThrow(/permission denied/i);
      });
      await withRollback(admin, async () => {
        await admin.query(`SELECT set_config('request.jwt.claims', '', true)`);
        await admin.query(`SELECT set_config('request.jwt.claim.sub', '', true)`);
        await admin.query('SET LOCAL ROLE authenticated');
        await expect(create()).rejects.toThrow(/not_authenticated/);
      });
    });
  });

  describe('accept_invitation', () => {
    const invite = async (email: string, role = 'mechanic') => {
      const id = await createAuthUser(admin, email);
      await admin.query(
        `INSERT INTO workshop_members (workshop_id, user_id, role, status) VALUES ($1, $2, $3, 'invited')`,
        [WORKSHOP_A, id, role],
      );
      return id;
    };

    it('activa la invitación del propio usuario y devuelve el taller', async () => {
      await withRollback(admin, async () => {
        const id = await invite('invitado@example.com', 'advisor');
        await actAsUser(admin, id);
        const { rows } = await admin.query(`SELECT accept_invitation() AS workshop_id`);
        expect(rows[0].workshop_id).toBe(WORKSHOP_A);

        await actAsAdmin(admin);
        const member = await admin.query(
          `SELECT role, status, joined_at FROM workshop_members WHERE user_id = $1`,
          [id],
        );
        expect(member.rows[0]).toMatchObject({ role: 'advisor', status: 'active' });
        expect(member.rows[0].joined_at).not.toBeNull();
      });
    });

    it('sin invitación pendiente falla', async () => {
      await withRollback(admin, async () => {
        await newUser();
        await expect(admin.query(`SELECT accept_invitation()`)).rejects.toThrow(
          /no_pending_invitation/,
        );
      });
    });

    it('un miembro ya activo no tiene invitación que aceptar', async () => {
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_OWNER_A);
        await expect(admin.query(`SELECT accept_invitation()`)).rejects.toThrow(
          /no_pending_invitation/,
        );
      });
    });

    it('no activa la invitación de otra persona', async () => {
      await withRollback(admin, async () => {
        const otro = await invite('otro-invitado@example.com');
        await newUser('intruso@example.com');
        await admin.query('SAVEPOINT s');
        await expect(admin.query(`SELECT accept_invitation()`)).rejects.toThrow(
          /no_pending_invitation/,
        );
        await admin.query('ROLLBACK TO SAVEPOINT s');
        await actAsAdmin(admin);
        const { rows } = await admin.query(
          `SELECT status FROM workshop_members WHERE user_id = $1`,
          [otro],
        );
        expect(rows[0].status).toBe('invited');
      });
    });

    it('no se ejecuta como anon', async () => {
      await withRollback(admin, async () => {
        await admin.query('SET LOCAL ROLE anon');
        await expect(admin.query(`SELECT accept_invitation()`)).rejects.toThrow(
          /permission denied/i,
        );
      });
    });
  });

  describe('restricciones de membresías', () => {
    it('un usuario no puede tener dos membresías activas o invitadas', async () => {
      await withRollback(admin, async () => {
        const id = await createAuthUser(admin, 'doble@example.com');
        await admin.query(
          `INSERT INTO workshop_members (workshop_id, user_id, role, status) VALUES ($1, $2, 'mechanic', 'invited')`,
          [WORKSHOP_A, id],
        );
        await expect(
          admin.query(
            `INSERT INTO workshop_members (workshop_id, user_id, role, status)
             VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', $1, 'advisor', 'active')`,
            [id],
          ),
        ).rejects.toThrow(/idx_workshop_members_one_workshop|duplicate key/);
      });
    });

    it('un taller no puede tener dos owners activos', async () => {
      await withRollback(admin, async () => {
        const id = await createAuthUser(admin, 'segundo-owner@example.com');
        await expect(
          admin.query(
            `INSERT INTO workshop_members (workshop_id, user_id, role, status) VALUES ($1, $2, 'owner', 'active')`,
            [WORKSHOP_A, id],
          ),
        ).rejects.toThrow(/idx_workshop_members_one_owner|duplicate key/);
      });
    });

    it('un owner inactivo no cuenta: el taller puede tener otro', async () => {
      await withRollback(admin, async () => {
        await admin.query(`UPDATE workshop_members SET status = 'inactive' WHERE user_id = $1`, [
          USER_OWNER_A,
        ]);
        const id = await createAuthUser(admin, 'nuevo-owner@example.com');
        const res = await admin.query(
          `INSERT INTO workshop_members (workshop_id, user_id, role, status) VALUES ($1, $2, 'owner', 'active')`,
          [WORKSHOP_A, id],
        );
        expect(res.rowCount).toBe(1);
      });
    });

    it('desactivar la membresía libera al usuario para otro taller', async () => {
      await withRollback(admin, async () => {
        await admin.query(
          `UPDATE workshop_members SET status = 'inactive' WHERE user_id = 'a0000000-0000-4000-8000-000000000003'`,
        );
        await actAsUser(admin, 'a0000000-0000-4000-8000-000000000003');
        expect((await create()).rows[0].id).toBeTruthy();
      });
    });
  });

  describe('el owner no puede saltarse la invitación', () => {
    /** Deja una invitación pendiente y pasa a actuar como el owner del Taller A. */
    async function asOwnerWithPendingInvite(role = 'mechanic') {
      const id = await createAuthUser(admin, 'pendiente@example.com');
      await admin.query(
        `INSERT INTO workshop_members (workshop_id, user_id, role, status) VALUES ($1, $2, $3, 'invited')`,
        [WORKSHOP_A, id, role],
      );
      await actAsUser(admin, USER_OWNER_A);
      return id;
    }

    it('no inserta membresías directamente', async () => {
      await withRollback(admin, async () => {
        const id = await createAuthUser(admin, 'directo@example.com');
        await actAsUser(admin, USER_OWNER_A);
        await expect(
          admin.query(
            `INSERT INTO workshop_members (workshop_id, user_id, role, status) VALUES ($1, $2, 'mechanic', 'active')`,
            [WORKSHOP_A, id],
          ),
        ).rejects.toThrow(RLS_VIOLATION);
      });
    });

    it('no activa una invitación pendiente: la acepta el invitado', async () => {
      await withRollback(admin, async () => {
        const id = await asOwnerWithPendingInvite();
        await expect(
          admin.query(`UPDATE workshop_members SET status = 'active' WHERE user_id = $1`, [id]),
        ).rejects.toThrow(/invitation_must_be_accepted_by_invitee/);
      });
    });

    it('sí puede cancelar la invitación (inactive)', async () => {
      await withRollback(admin, async () => {
        const id = await asOwnerWithPendingInvite();
        const res = await admin.query(
          `UPDATE workshop_members SET status = 'inactive' WHERE user_id = $1`,
          [id],
        );
        expect(res.rowCount).toBe(1);
      });
    });

    it('sí puede cambiar el rol de un miembro entre advisor y mechanic', async () => {
      await withRollback(admin, async () => {
        const id = await asOwnerWithPendingInvite('advisor');
        const res = await admin.query(
          `UPDATE workshop_members SET role = 'mechanic' WHERE user_id = $1`,
          [id],
        );
        expect(res.rowCount).toBe(1);
      });
    });

    it('no convierte a otro miembro en owner (owner único)', async () => {
      await withRollback(admin, async () => {
        const id = await asOwnerWithPendingInvite();
        await expect(
          admin.query(`UPDATE workshop_members SET role = 'owner' WHERE user_id = $1`, [id]),
        ).rejects.toThrow(/idx_workshop_members_one_owner|duplicate key/);
      });
    });

    it('no reasigna una membresía a otro usuario ni a otro taller', async () => {
      await withRollback(admin, async () => {
        const id = await asOwnerWithPendingInvite();
        await admin.query('SAVEPOINT s');
        await expect(
          admin.query(`UPDATE workshop_members SET user_id = $1 WHERE user_id = $2`, [
            'a0000000-0000-4000-8000-000000000003',
            id,
          ]),
        ).rejects.toThrow(/workshop_member_identity_immutable/);
        await admin.query('ROLLBACK TO SAVEPOINT s');
        await expect(
          admin.query(
            `UPDATE workshop_members SET workshop_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' WHERE user_id = $1`,
            [id],
          ),
        ).rejects.toThrow(/workshop_member_identity_immutable|row-level security/);
      });
    });
  });
});
