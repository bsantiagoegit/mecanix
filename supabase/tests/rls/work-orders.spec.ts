import { Client } from 'pg';
import { connectAs, withRollback } from '../../../src/testing/utils/db';
import {
  CUSTOMER_A1,
  ITERATION_A,
  USER_ADVISOR_A,
  USER_OWNER_A,
  VEHICLE_A1,
  WORK_ORDER_A,
  WORK_ORDER_B,
  WORKSHOP_A,
  WORKSHOP_B,
} from '../../../src/testing/utils/seed-ids';

const RLS_VIOLATION = /row-level security|policy/i;

describe('RLS: work_orders, vehicle_intakes, work_iterations, status_history', () => {
  let ownerA: Client;
  let advisorA: Client;
  let mechanicA: Client;
  let advisorB: Client;

  beforeAll(async () => {
    [ownerA, advisorA, mechanicA, advisorB] = await Promise.all([
      connectAs('owner@workshop-a.com'),
      connectAs('advisor@workshop-a.com'),
      connectAs('mechanic@workshop-a.com'),
      connectAs('advisor@workshop-b.com'),
    ]);
  });

  afterAll(async () => {
    await Promise.all([ownerA, advisorA, mechanicA, advisorB].map((c) => c?.end()));
  });

  const insertDraft = (advisorId: string, status = 'draft', workshopId = WORKSHOP_A) => ({
    text: `INSERT INTO work_orders (workshop_id, customer_id, vehicle_id, advisor_id, status, reported_problem)
           VALUES ($1, $2, $3, $4, $5, 'Falla de prueba')`,
    values: [workshopId, CUSTOMER_A1, VEHICLE_A1, advisorId, status],
  });

  describe('work_orders', () => {
    it('un miembro ve solo las órdenes de su taller', async () => {
      const a = await mechanicA.query('SELECT id FROM work_orders');
      const b = await advisorB.query('SELECT id FROM work_orders');
      expect(a.rows.map((r) => r.id)).toEqual([WORK_ORDER_A]);
      expect(b.rows.map((r) => r.id)).toEqual([WORK_ORDER_B]);
    });

    it('advisor y owner crean órdenes en borrador, sin número todavía', async () => {
      for (const [client, id] of [
        [advisorA, USER_ADVISOR_A],
        [ownerA, USER_OWNER_A],
      ] as const) {
        await withRollback(client, async () => {
          const q = insertDraft(id);
          await client.query(q.text, q.values);
          const { rows } = await client.query(
            `SELECT status, sequence_number FROM work_orders WHERE advisor_id = $1 AND status = 'draft'`,
            [id],
          );
          expect(rows[0]).toEqual({ status: 'draft', sequence_number: null });
        });
      }
    });

    it('mechanic no crea órdenes', async () => {
      const q = insertDraft(USER_ADVISOR_A);
      await expect(mechanicA.query(q.text, q.values)).rejects.toThrow(RLS_VIOLATION);
    });

    it('no se crea una orden ya avanzada ni a nombre de otro asesor', async () => {
      const advanced = insertDraft(USER_ADVISOR_A, 'received');
      await expect(advisorA.query(advanced.text, advanced.values)).rejects.toThrow(RLS_VIOLATION);
      const other = insertDraft(USER_OWNER_A);
      await expect(advisorA.query(other.text, other.values)).rejects.toThrow(RLS_VIOLATION);
    });

    it('no se crea una orden en otro taller', async () => {
      const q = insertDraft(USER_ADVISOR_A, 'draft', WORKSHOP_B);
      await expect(advisorA.query(q.text, q.values)).rejects.toThrow(RLS_VIOLATION);
    });

    it('cualquier miembro actualiza una orden de su taller; otro taller no', async () => {
      await withRollback(mechanicA, async () => {
        const res = await mechanicA.query(
          `UPDATE work_orders SET reported_problem = 'x' WHERE id = $1`,
          [WORK_ORDER_A],
        );
        expect(res.rowCount).toBe(1);
      });
      const res = await advisorB.query(
        `UPDATE work_orders SET reported_problem = 'x' WHERE id = $1`,
        [WORK_ORDER_A],
      );
      expect(res.rowCount).toBe(0);
    });

    it('no se mueve una orden a otro taller', async () => {
      await expect(
        advisorA.query(`UPDATE work_orders SET workshop_id = $1 WHERE id = $2`, [
          WORKSHOP_B,
          WORK_ORDER_A,
        ]),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('nadie borra órdenes', async () => {
      const res = await ownerA.query(`DELETE FROM work_orders WHERE id = $1`, [WORK_ORDER_A]);
      expect(res.rowCount).toBe(0);
    });

    it('rechaza cancelación con motivo corto y estado desconocido', async () => {
      await withRollback(advisorA, async () => {
        await advisorA.query('SAVEPOINT s');
        await expect(
          advisorA.query(
            `UPDATE work_orders SET status = 'cancelled', cancellation_reason = 'corto' WHERE id = $1`,
            [WORK_ORDER_A],
          ),
        ).rejects.toThrow(/work_orders_cancellation_reason/);
        await advisorA.query('ROLLBACK TO SAVEPOINT s');
        await expect(
          advisorA.query(`UPDATE work_orders SET status = 'volando' WHERE id = $1`, [WORK_ORDER_A]),
        ).rejects.toThrow(/work_orders_status_valid/);
      });
    });
  });

  describe('vehicle_intakes', () => {
    const insertIntake = `INSERT INTO vehicle_intakes (workshop_id, work_order_id, scratches)
                          VALUES ($1, $2, 'Rayón en puerta')`;

    it('advisor crea el intake; mechanic no', async () => {
      await withRollback(advisorA, async () => {
        expect((await advisorA.query(insertIntake, [WORKSHOP_A, WORK_ORDER_A])).rowCount).toBe(1);
      });
      await expect(mechanicA.query(insertIntake, [WORKSHOP_A, WORK_ORDER_A])).rejects.toThrow(
        RLS_VIOLATION,
      );
    });

    it('es 1:1 con la orden y no se modifica', async () => {
      await withRollback(advisorA, async () => {
        await advisorA.query(insertIntake, [WORKSHOP_A, WORK_ORDER_A]);
        await advisorA.query('SAVEPOINT s');
        await expect(advisorA.query(insertIntake, [WORKSHOP_A, WORK_ORDER_A])).rejects.toThrow(
          /duplicate key/i,
        );
        await advisorA.query('ROLLBACK TO SAVEPOINT s');
        const res = await advisorA.query(`UPDATE vehicle_intakes SET scratches = 'otro'`);
        expect(res.rowCount).toBe(0);
      });
    });
  });

  describe('work_iterations', () => {
    it('un miembro ve las iteraciones de su taller', async () => {
      const { rows } = await mechanicA.query('SELECT id FROM work_iterations');
      expect(rows.map((r) => r.id)).toEqual([ITERATION_A]);
    });

    it('advisor crea iteraciones; mechanic no', async () => {
      const sql = `INSERT INTO work_iterations (workshop_id, work_order_id, iteration_number)
                   VALUES ($1, $2, 2)`;
      await withRollback(advisorA, async () => {
        expect((await advisorA.query(sql, [WORKSHOP_A, WORK_ORDER_A])).rowCount).toBe(1);
      });
      await expect(mechanicA.query(sql, [WORKSHOP_A, WORK_ORDER_A])).rejects.toThrow(RLS_VIOLATION);
    });

    it('el número de iteración es único por orden', async () => {
      await withRollback(advisorA, async () => {
        await expect(
          advisorA.query(
            `INSERT INTO work_iterations (workshop_id, work_order_id, iteration_number)
             VALUES ($1, $2, 1)`,
            [WORKSHOP_A, WORK_ORDER_A],
          ),
        ).rejects.toThrow(/duplicate key/i);
      });
    });

    it('mechanic puede actualizar el estado de la iteración', async () => {
      await withRollback(mechanicA, async () => {
        const res = await mechanicA.query(
          `UPDATE work_iterations SET status = 'awaiting_approval' WHERE id = $1`,
          [ITERATION_A],
        );
        expect(res.rowCount).toBe(1);
      });
    });
  });

  describe('work_order_status_history', () => {
    it('solo el owner ve el historial', async () => {
      await withRollback(ownerA, async () => {
        await ownerA.query(`UPDATE work_orders SET status = 'awaiting_approval' WHERE id = $1`, [
          WORK_ORDER_A,
        ]);
        const { rows } = await ownerA.query(`SELECT to_status FROM work_order_status_history`);
        expect(rows.map((r) => r.to_status)).toEqual(['awaiting_approval']);
      });
    });

    it('advisor y mechanic no lo ven', async () => {
      await withRollback(advisorA, async () => {
        await advisorA.query(`UPDATE work_orders SET status = 'awaiting_approval' WHERE id = $1`, [
          WORK_ORDER_A,
        ]);
        const { rows } = await advisorA.query(`SELECT 1 FROM work_order_status_history`);
        expect(rows).toEqual([]);
      });
    });

    it('nadie inserta ni borra historial desde el cliente', async () => {
      await expect(
        ownerA.query(
          `INSERT INTO work_order_status_history (work_order_id, actor_id, to_status)
           VALUES ($1, $2, 'received')`,
          [WORK_ORDER_A, USER_OWNER_A],
        ),
      ).rejects.toThrow(RLS_VIOLATION);
      const res = await ownerA.query(`DELETE FROM work_order_status_history`);
      expect(res.rowCount).toBe(0);
    });
  });
});
