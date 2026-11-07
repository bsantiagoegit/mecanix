import { Client } from 'pg';
import { connectAs, withRollback } from '../../../src/testing/utils/db';
import {
  USER_ADVISOR_A,
  USER_ADVISOR_B,
  USER_MECHANIC_A,
  USER_OWNER_A,
  USER_OWNER_B,
  WORKSHOP_A,
  WORKSHOP_B,
} from '../../../src/testing/utils/seed-ids';

const RLS_VIOLATION = /row-level security|policy/i;

describe('RLS: tenancy', () => {
  let ownerA: Client;
  let advisorA: Client;
  let mechanicA: Client;
  let ownerB: Client;
  let advisorB: Client;

  beforeAll(async () => {
    [ownerA, advisorA, mechanicA, ownerB, advisorB] = await Promise.all([
      connectAs('owner@workshop-a.com'),
      connectAs('advisor@workshop-a.com'),
      connectAs('mechanic@workshop-a.com'),
      connectAs('owner@workshop-b.com'),
      connectAs('advisor@workshop-b.com'),
    ]);
  });

  afterAll(async () => {
    await Promise.all([ownerA, advisorA, mechanicA, ownerB, advisorB].map((c) => c?.end()));
  });

  describe('roles', () => {
    it('un usuario autenticado lee el catálogo de roles', async () => {
      const { rows } = await mechanicA.query('SELECT code FROM roles ORDER BY code');
      expect(rows.map((r) => r.code)).toEqual(['advisor', 'mechanic', 'owner']);
    });

    it('nadie inserta roles desde el cliente', async () => {
      await expect(
        ownerA.query(`INSERT INTO roles (code, name, description) VALUES ('x', 'X', 'X')`),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('nadie modifica roles desde el cliente', async () => {
      const res = await ownerA.query(`UPDATE roles SET name = 'Hack' WHERE code = 'owner'`);
      expect(res.rowCount).toBe(0);
    });
  });

  describe('workshops', () => {
    it('un miembro ve solo su taller', async () => {
      const a = await advisorA.query('SELECT id FROM workshops');
      const b = await advisorB.query('SELECT id FROM workshops');
      expect(a.rows.map((r) => r.id)).toEqual([WORKSHOP_A]);
      expect(b.rows.map((r) => r.id)).toEqual([WORKSHOP_B]);
    });

    it('el owner actualiza su taller', async () => {
      await withRollback(ownerA, async () => {
        const res = await ownerA.query(`UPDATE workshops SET capacity = 9 WHERE id = $1`, [
          WORKSHOP_A,
        ]);
        expect(res.rowCount).toBe(1);
      });
    });

    it('un advisor no actualiza el taller', async () => {
      const res = await advisorA.query(`UPDATE workshops SET capacity = 9 WHERE id = $1`, [
        WORKSHOP_A,
      ]);
      expect(res.rowCount).toBe(0);
    });

    it('el owner de otro taller no lo actualiza', async () => {
      const res = await ownerB.query(`UPDATE workshops SET capacity = 9 WHERE id = $1`, [
        WORKSHOP_A,
      ]);
      expect(res.rowCount).toBe(0);
    });

    it('nadie crea talleres desde el cliente', async () => {
      await expect(
        ownerA.query(`INSERT INTO workshops (name, address, phone) VALUES ('X', 'X', 'X')`),
      ).rejects.toThrow(RLS_VIOLATION);
    });
  });

  describe('users', () => {
    it('un usuario ve su perfil y el de quienes comparten taller', async () => {
      const { rows } = await mechanicA.query('SELECT id FROM users ORDER BY id');
      expect(rows.map((r) => r.id)).toEqual([USER_OWNER_A, USER_ADVISOR_A, USER_MECHANIC_A]);
    });

    it('un usuario no ve perfiles de otros talleres', async () => {
      const { rows } = await advisorB.query('SELECT id FROM users ORDER BY id');
      expect(rows.map((r) => r.id)).toEqual([USER_OWNER_B, USER_ADVISOR_B]);
    });

    it('un usuario actualiza su propio perfil', async () => {
      await withRollback(mechanicA, async () => {
        const res = await mechanicA.query(`UPDATE users SET phone = '0988' WHERE id = $1`, [
          USER_MECHANIC_A,
        ]);
        expect(res.rowCount).toBe(1);
      });
    });

    it('un usuario no actualiza el perfil de un compañero', async () => {
      const res = await ownerA.query(`UPDATE users SET phone = '0988' WHERE id = $1`, [
        USER_MECHANIC_A,
      ]);
      expect(res.rowCount).toBe(0);
    });

    it('nadie inserta ni elimina perfiles desde el cliente', async () => {
      await expect(
        ownerA.query(
          `INSERT INTO users (id, email, full_name) VALUES (gen_random_uuid(), 'x@x.com', 'X')`,
        ),
      ).rejects.toThrow(/row-level security|policy|foreign key/i);
      const res = await ownerA.query(`DELETE FROM users WHERE id = $1`, [USER_MECHANIC_A]);
      expect(res.rowCount).toBe(0);
    });
  });

  describe('workshop_members', () => {
    it('un mechanic ve solo su propia membresía', async () => {
      const { rows } = await mechanicA.query('SELECT user_id FROM workshop_members');
      expect(rows.map((r) => r.user_id)).toEqual([USER_MECHANIC_A]);
    });

    it('un owner ve todas las membresías de su taller y de ningún otro', async () => {
      const { rows } = await ownerA.query('SELECT workshop_id FROM workshop_members');
      expect(rows).toHaveLength(3);
      expect(rows.every((r) => r.workshop_id === WORKSHOP_A)).toBe(true);
    });

    it('un owner invita a un usuario a su taller', async () => {
      await withRollback(ownerA, async () => {
        const res = await ownerA.query(
          `INSERT INTO workshop_members (workshop_id, user_id, role, status)
           VALUES ($1, $2, 'mechanic', 'invited')`,
          [WORKSHOP_A, USER_ADVISOR_B],
        );
        expect(res.rowCount).toBe(1);
      });
    });

    it('un advisor no invita usuarios', async () => {
      await expect(
        advisorA.query(
          `INSERT INTO workshop_members (workshop_id, user_id, role) VALUES ($1, $2, 'mechanic')`,
          [WORKSHOP_A, USER_ADVISOR_B],
        ),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('un owner no invita usuarios a otro taller', async () => {
      await expect(
        ownerA.query(
          `INSERT INTO workshop_members (workshop_id, user_id, role) VALUES ($1, $2, 'mechanic')`,
          [WORKSHOP_B, USER_MECHANIC_A],
        ),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('un owner desactiva una membresía de su taller', async () => {
      await withRollback(ownerA, async () => {
        const res = await ownerA.query(
          `UPDATE workshop_members SET status = 'inactive' WHERE workshop_id = $1 AND user_id = $2`,
          [WORKSHOP_A, USER_MECHANIC_A],
        );
        expect(res.rowCount).toBe(1);
      });
    });

    it('un advisor no modifica membresías', async () => {
      const res = await advisorA.query(
        `UPDATE workshop_members SET status = 'inactive' WHERE workshop_id = $1 AND user_id = $2`,
        [WORKSHOP_A, USER_MECHANIC_A],
      );
      expect(res.rowCount).toBe(0);
    });

    it('nadie elimina membresías', async () => {
      const res = await ownerA.query(`DELETE FROM workshop_members WHERE workshop_id = $1`, [
        WORKSHOP_A,
      ]);
      expect(res.rowCount).toBe(0);
    });
  });

  describe('helpers', () => {
    it('auth_role_in devuelve el rol en el taller propio y null en otro', async () => {
      const own = await mechanicA.query('SELECT auth_role_in($1) AS role', [WORKSHOP_A]);
      const other = await mechanicA.query('SELECT auth_role_in($1) AS role', [WORKSHOP_B]);
      expect(own.rows[0].role).toBe('mechanic');
      expect(other.rows[0].role).toBeNull();
    });

    it('auth_workshop_ids devuelve solo los talleres activos del usuario', async () => {
      const { rows } = await advisorA.query('SELECT auth_workshop_ids() AS ids');
      expect(rows[0].ids).toEqual([WORKSHOP_A]);
    });
  });
});
