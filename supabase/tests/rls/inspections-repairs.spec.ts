import { Client } from 'pg';
import { connectAs, withRollback } from '../../../src/testing/utils/db';
import {
  FINDING_A,
  INSPECTION_A,
  ITERATION_A,
  REPAIR_A,
  REPAIR_B,
  USER_ADVISOR_A,
  USER_MECHANIC_A,
  USER_OWNER_A,
  WORKSHOP_A,
} from '../../../src/testing/utils/seed-ids';

const RLS_VIOLATION = /row-level security|policy/i;

describe('RLS: inspections, findings, diagnoses, repairs, approvals, labor', () => {
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

  describe('inspections / findings / diagnoses', () => {
    const inspection = `INSERT INTO inspections (workshop_id, work_iteration_id, mechanic_id)
                        VALUES ($1, $2, $3)`;
    const finding = `INSERT INTO findings (workshop_id, inspection_id, created_by, description)
                     VALUES ($1, $2, $3, 'Hallazgo')`;
    const diagnosis = `INSERT INTO diagnoses (workshop_id, finding_id, created_by, description)
                       VALUES ($1, $2, $3, 'Diagnóstico')`;

    it('todos los miembros ven lo de su taller; otro taller no ve nada', async () => {
      for (const client of [ownerA, advisorA, mechanicA]) {
        expect((await client.query('SELECT 1 FROM inspections')).rows).toHaveLength(1);
        expect((await client.query('SELECT 1 FROM findings')).rows).toHaveLength(1);
        expect((await client.query('SELECT 1 FROM diagnoses')).rows).toHaveLength(1);
      }
      for (const table of ['inspections', 'findings', 'diagnoses']) {
        expect((await advisorB.query(`SELECT 1 FROM ${table}`)).rows).toEqual([]);
      }
    });

    it('mechanic crea inspección, hallazgo y diagnóstico a su nombre', async () => {
      await withRollback(mechanicA, async () => {
        expect(
          (await mechanicA.query(inspection, [WORKSHOP_A, ITERATION_A, USER_MECHANIC_A])).rowCount,
        ).toBe(1);
        expect(
          (await mechanicA.query(finding, [WORKSHOP_A, INSPECTION_A, USER_MECHANIC_A])).rowCount,
        ).toBe(1);
        expect(
          (await mechanicA.query(diagnosis, [WORKSHOP_A, FINDING_A, USER_MECHANIC_A])).rowCount,
        ).toBe(1);
      });
    });

    it('advisor y owner no inspeccionan, ni hallan, ni diagnostican', async () => {
      for (const client of [advisorA, ownerA]) {
        const userId = client === advisorA ? USER_ADVISOR_A : USER_OWNER_A;
        await expect(client.query(inspection, [WORKSHOP_A, ITERATION_A, userId])).rejects.toThrow(
          RLS_VIOLATION,
        );
        await expect(client.query(finding, [WORKSHOP_A, INSPECTION_A, userId])).rejects.toThrow(
          RLS_VIOLATION,
        );
        await expect(client.query(diagnosis, [WORKSHOP_A, FINDING_A, userId])).rejects.toThrow(
          RLS_VIOLATION,
        );
      }
    });

    it('el mechanic no firma como otro usuario', async () => {
      await expect(
        mechanicA.query(finding, [WORKSHOP_A, INSPECTION_A, USER_OWNER_A]),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('solo mechanic modifica hallazgos', async () => {
      await withRollback(mechanicA, async () => {
        const res = await mechanicA.query(`UPDATE findings SET description = 'x' WHERE id = $1`, [
          FINDING_A,
        ]);
        expect(res.rowCount).toBe(1);
      });
      const res = await advisorA.query(`UPDATE findings SET description = 'x' WHERE id = $1`, [
        FINDING_A,
      ]);
      expect(res.rowCount).toBe(0);
    });
  });

  describe('recommended_repairs / repair_findings', () => {
    const repair = `INSERT INTO recommended_repairs
                      (workshop_id, work_iteration_id, created_by, description, estimated_cost)
                    VALUES ($1, $2, $3, 'Reparación', 10)`;

    it('mechanic crea reparaciones recomendadas; advisor no', async () => {
      await withRollback(mechanicA, async () => {
        expect(
          (await mechanicA.query(repair, [WORKSHOP_A, ITERATION_A, USER_MECHANIC_A])).rowCount,
        ).toBe(1);
      });
      await expect(
        advisorA.query(repair, [WORKSHOP_A, ITERATION_A, USER_ADVISOR_A]),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('cualquier miembro actualiza el estado; otro taller no', async () => {
      await withRollback(advisorA, async () => {
        const res = await advisorA.query(
          `UPDATE recommended_repairs SET status = 'approved' WHERE id = $1`,
          [REPAIR_A],
        );
        expect(res.rowCount).toBe(1);
      });
      const res = await advisorB.query(
        `UPDATE recommended_repairs SET status = 'approved' WHERE id = $1`,
        [REPAIR_A],
      );
      expect(res.rowCount).toBe(0);
    });

    it('repair_findings se ve por EXISTS en el taller; otro taller no ve', async () => {
      expect((await advisorA.query('SELECT 1 FROM repair_findings')).rows).toHaveLength(1);
      expect((await advisorB.query('SELECT 1 FROM repair_findings')).rows).toEqual([]);
    });

    it('solo mechanic vincula hallazgos y la tabla es append-only', async () => {
      await withRollback(mechanicA, async () => {
        const dup = `INSERT INTO repair_findings (recommended_repair_id, finding_id) VALUES ($1, $2)`;
        await mechanicA.query('SAVEPOINT s');
        await expect(mechanicA.query(dup, [REPAIR_A, FINDING_A])).rejects.toThrow(/duplicate key/i);
        await mechanicA.query('ROLLBACK TO SAVEPOINT s');
        expect((await mechanicA.query('DELETE FROM repair_findings')).rowCount).toBe(0);
      });
      await expect(
        advisorA.query(
          `INSERT INTO repair_findings (recommended_repair_id, finding_id) VALUES ($1, $2)`,
          [REPAIR_A, FINDING_A],
        ),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('no se vincula una reparación de otro taller', async () => {
      await expect(
        mechanicA.query(
          `INSERT INTO repair_findings (recommended_repair_id, finding_id) VALUES ($1, $2)`,
          [REPAIR_B, FINDING_A],
        ),
      ).rejects.toThrow(RLS_VIOLATION);
    });
  });

  describe('approvals', () => {
    const approval = `INSERT INTO approvals
                        (workshop_id, recommended_repair_id, approved_by, decision, channel)
                      VALUES ($1, $2, $3, 'approved', 'phone')`;

    it('advisor y owner registran aprobaciones; mechanic no', async () => {
      await withRollback(advisorA, async () => {
        expect(
          (await advisorA.query(approval, [WORKSHOP_A, REPAIR_A, USER_ADVISOR_A])).rowCount,
        ).toBe(1);
      });
      await expect(
        mechanicA.query(approval, [WORKSHOP_A, REPAIR_A, USER_MECHANIC_A]),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('son históricas: se pueden repetir y no se modifican', async () => {
      await withRollback(advisorA, async () => {
        await advisorA.query(approval, [WORKSHOP_A, REPAIR_A, USER_ADVISOR_A]);
        await advisorA.query(approval, [WORKSHOP_A, REPAIR_A, USER_ADVISOR_A]);
        expect((await advisorA.query(`UPDATE approvals SET notes = 'x'`)).rowCount).toBe(0);
        expect((await advisorA.query(`DELETE FROM approvals`)).rowCount).toBe(0);
      });
    });

    it('no se aprueba a nombre de otro usuario', async () => {
      await expect(advisorA.query(approval, [WORKSHOP_A, REPAIR_A, USER_OWNER_A])).rejects.toThrow(
        RLS_VIOLATION,
      );
    });

    it('rechaza un canal desconocido', async () => {
      await withRollback(advisorA, async () => {
        await expect(
          advisorA.query(
            `INSERT INTO approvals (workshop_id, recommended_repair_id, approved_by, decision, channel)
             VALUES ($1, $2, $3, 'approved', 'paloma')`,
            [WORKSHOP_A, REPAIR_A, USER_ADVISOR_A],
          ),
        ).rejects.toThrow(/approvals_channel_valid/);
      });
    });
  });

  describe('performed_repairs / labor_entries', () => {
    const performed = `INSERT INTO performed_repairs (workshop_id, recommended_repair_id, mechanic_id)
                       VALUES ($1, $2, $3) RETURNING id`;

    it('mechanic registra la reparación realizada y las horas; advisor no', async () => {
      await withRollback(mechanicA, async () => {
        const { rows } = await mechanicA.query(performed, [WORKSHOP_A, REPAIR_A, USER_MECHANIC_A]);
        const labor = await mechanicA.query(
          `INSERT INTO labor_entries (workshop_id, performed_repair_id, mechanic_id, minutes)
           VALUES ($1, $2, $3, 90)`,
          [WORKSHOP_A, rows[0].id, USER_MECHANIC_A],
        );
        expect(labor.rowCount).toBe(1);

        const upd = await mechanicA.query(
          `UPDATE performed_repairs SET status = 'completed' WHERE id = $1`,
          [rows[0].id],
        );
        expect(upd.rowCount).toBe(1);
        expect((await mechanicA.query(`UPDATE labor_entries SET minutes = 5`)).rowCount).toBe(0);
      });
      await expect(
        advisorA.query(performed, [WORKSHOP_A, REPAIR_A, USER_ADVISOR_A]),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('una entrada de horas no supera 24 h ni es cero', async () => {
      await withRollback(mechanicA, async () => {
        const { rows } = await mechanicA.query(performed, [WORKSHOP_A, REPAIR_A, USER_MECHANIC_A]);
        for (const minutes of [0, 1441]) {
          await mechanicA.query('SAVEPOINT s');
          await expect(
            mechanicA.query(
              `INSERT INTO labor_entries (workshop_id, performed_repair_id, mechanic_id, minutes)
               VALUES ($1, $2, $3, $4)`,
              [WORKSHOP_A, rows[0].id, USER_MECHANIC_A, minutes],
            ),
          ).rejects.toThrow(/labor_entries_minutes_valid/);
          await mechanicA.query('ROLLBACK TO SAVEPOINT s');
        }
      });
    });

    it('otro taller no ve reparaciones realizadas ni horas', async () => {
      await withRollback(mechanicA, async () => {
        await mechanicA.query(performed, [WORKSHOP_A, REPAIR_A, USER_MECHANIC_A]);
        expect((await advisorB.query('SELECT 1 FROM performed_repairs')).rows).toEqual([]);
      });
    });
  });
});
