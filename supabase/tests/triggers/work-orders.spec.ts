import { Client } from 'pg';
import { connectAsAdmin, withRollback } from '../../../src/testing/utils/db';
import {
  CUSTOMER_A1,
  USER_ADVISOR_A,
  USER_OWNER_A,
  VEHICLE_A1,
  WORK_ORDER_A,
  WORKSHOP_A,
  WORKSHOP_B,
} from '../../../src/testing/utils/seed-ids';

const YEAR = new Date().getFullYear();

describe('Triggers: work_orders', () => {
  let admin: Client;

  beforeAll(async () => {
    admin = await connectAsAdmin();
  });

  afterAll(async () => {
    await admin?.end();
  });

  /** Fija el usuario que "actúa" (auth.uid()) dentro de la transacción actual. */
  const actAs = (userId: string) =>
    admin.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);

  const createDraft = async (workshopId = WORKSHOP_A): Promise<string> => {
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO work_orders (workshop_id, customer_id, vehicle_id, advisor_id, reported_problem)
       SELECT $1, c.id, v.id, $2, 'Falla'
         FROM customers c, vehicles v
        WHERE c.workshop_id = $1 AND v.workshop_id = $1
        LIMIT 1
       RETURNING id`,
      [
        workshopId,
        workshopId === WORKSHOP_A ? USER_ADVISOR_A : 'b0000000-0000-4000-8000-000000000002',
      ],
    );
    return rows[0].id;
  };

  describe('numeración (draft → received)', () => {
    it('asigna OT-AAAA-0001, secuencial y con received_at', async () => {
      await withRollback(admin, async () => {
        await actAs(USER_ADVISOR_A);
        const first = await createDraft();
        const second = await createDraft();

        await admin.query(`UPDATE work_orders SET status = 'received' WHERE id = $1`, [first]);
        await admin.query(`UPDATE work_orders SET status = 'received' WHERE id = $1`, [second]);

        const { rows } = await admin.query(
          `SELECT id, sequence_number, sequence_year, sequence_number_annual, received_at
             FROM work_orders WHERE id IN ($1, $2) ORDER BY sequence_number_annual`,
          [first, second],
        );
        expect(rows[0]).toMatchObject({
          id: first,
          sequence_number: `OT-${YEAR}-0001`,
          sequence_year: YEAR,
          sequence_number_annual: 1,
        });
        expect(rows[1].sequence_number).toBe(`OT-${YEAR}-0002`);
        expect(rows[0].received_at).not.toBeNull();
      });
    });

    it('cada taller numera por separado', async () => {
      await withRollback(admin, async () => {
        await actAs(USER_ADVISOR_A);
        const a = await createDraft(WORKSHOP_A);
        const b = await createDraft(WORKSHOP_B);
        await admin.query(`UPDATE work_orders SET status = 'received' WHERE id = ANY($1)`, [
          [a, b],
        ]);

        const { rows } = await admin.query(
          `SELECT workshop_id, sequence_number FROM work_orders WHERE id = ANY($1)`,
          [[a, b]],
        );
        expect(rows.map((r) => r.sequence_number)).toEqual([`OT-${YEAR}-0001`, `OT-${YEAR}-0001`]);
      });
    });

    it('no numera otras transiciones ni órdenes que ya tienen número', async () => {
      await withRollback(admin, async () => {
        await actAs(USER_OWNER_A);
        await admin.query(`UPDATE work_orders SET status = 'awaiting_parts' WHERE id = $1`, [
          WORK_ORDER_A,
        ]);
        const { rows } = await admin.query(
          `SELECT sequence_number FROM work_orders WHERE id = $1`,
          [WORK_ORDER_A],
        );
        expect(rows[0].sequence_number).toBe('OT-2025-0001');
      });
    });

    it('una orden no avanza de draft sin numeración (CHECK)', async () => {
      await withRollback(admin, async () => {
        await expect(
          admin.query(
            `INSERT INTO work_orders (workshop_id, customer_id, vehicle_id, advisor_id, status, reported_problem)
             VALUES ($1, $2, $3, $4, 'received', 'x')`,
            [WORKSHOP_A, CUSTOMER_A1, VEHICLE_A1, USER_ADVISOR_A],
          ),
        ).rejects.toThrow(/work_orders_sequence_assigned/);
      });
    });
  });

  describe('historial de transiciones', () => {
    it('registra actor, origen, destino y motivo de cada cambio de estado', async () => {
      await withRollback(admin, async () => {
        await actAs(USER_OWNER_A);
        await admin.query(
          `UPDATE work_orders SET status = 'cancelled', cancelled_at = now(),
                  cancellation_reason = 'El cliente desistió del trabajo'
            WHERE id = $1`,
          [WORK_ORDER_A],
        );
        const { rows } = await admin.query(
          `SELECT actor_id, from_status, to_status, reason
             FROM work_order_status_history WHERE work_order_id = $1`,
          [WORK_ORDER_A],
        );
        expect(rows).toEqual([
          {
            actor_id: USER_OWNER_A,
            from_status: 'inspecting',
            to_status: 'cancelled',
            reason: 'El cliente desistió del trabajo',
          },
        ]);
      });
    });

    it('no registra nada si el estado no cambia', async () => {
      await withRollback(admin, async () => {
        await actAs(USER_OWNER_A);
        await admin.query(`UPDATE work_orders SET reported_problem = 'otro' WHERE id = $1`, [
          WORK_ORDER_A,
        ]);
        const { rows } = await admin.query(
          `SELECT 1 FROM work_order_status_history WHERE work_order_id = $1`,
          [WORK_ORDER_A],
        );
        expect(rows).toEqual([]);
      });
    });
  });

  describe('garantía automática (→ completed)', () => {
    it('crea la garantía con warranty_days del taller y fija completed_at', async () => {
      await withRollback(admin, async () => {
        await actAs(USER_OWNER_A);
        await admin.query(`UPDATE workshops SET warranty_days = 30 WHERE id = $1`, [WORKSHOP_A]);
        await admin.query(`UPDATE work_orders SET status = 'completed' WHERE id = $1`, [
          WORK_ORDER_A,
        ]);

        const order = await admin.query(`SELECT completed_at FROM work_orders WHERE id = $1`, [
          WORK_ORDER_A,
        ]);
        expect(order.rows[0].completed_at).not.toBeNull();

        const { rows } = await admin.query(
          `SELECT workshop_id, status,
                  round(extract(epoch FROM expires_at - starts_at) / 86400) AS days
             FROM warranties WHERE work_order_id = $1`,
          [WORK_ORDER_A],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ workshop_id: WORKSHOP_A, status: 'active' });
        expect(Number(rows[0].days)).toBe(30);
      });
    });

    it('no crea garantía en otras transiciones', async () => {
      await withRollback(admin, async () => {
        await actAs(USER_OWNER_A);
        await admin.query(`UPDATE work_orders SET status = 'awaiting_parts' WHERE id = $1`, [
          WORK_ORDER_A,
        ]);
        const { rows } = await admin.query(`SELECT 1 FROM warranties WHERE work_order_id = $1`, [
          WORK_ORDER_A,
        ]);
        expect(rows).toEqual([]);
      });
    });
  });
});
