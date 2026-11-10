import { Client } from 'pg';
import { connectAs, withRollback } from '../../../src/testing/utils/db';
import {
  CUSTOMER_A1,
  CUSTOMER_A2,
  CUSTOMER_B1,
  OWNERSHIP_A1,
  VEHICLE_A1,
  VEHICLE_A2,
  VEHICLE_B1,
  WORKSHOP_A,
  WORKSHOP_B,
} from '../../../src/testing/utils/seed-ids';

const RLS_VIOLATION = /row-level security|policy/i;

describe('RLS: customers, vehicles, vehicle_ownerships', () => {
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

  describe('customers', () => {
    it('un miembro ve solo los clientes de su taller', async () => {
      const a = await advisorA.query('SELECT id FROM customers ORDER BY id');
      const b = await advisorB.query('SELECT id FROM customers');
      expect(a.rows.map((r) => r.id)).toEqual([CUSTOMER_A1, CUSTOMER_A2]);
      expect(b.rows.map((r) => r.id)).toEqual([CUSTOMER_B1]);
    });

    it('advisor y owner crean clientes', async () => {
      for (const client of [advisorA, ownerA]) {
        await withRollback(client, async () => {
          const res = await client.query(
            `INSERT INTO customers (workshop_id, first_name, last_name, phone)
             VALUES ($1, 'Nuevo', 'Cliente', '0990000000')`,
            [WORKSHOP_A],
          );
          expect(res.rowCount).toBe(1);
        });
      }
    });

    it('mechanic no crea clientes', async () => {
      await expect(
        mechanicA.query(
          `INSERT INTO customers (workshop_id, first_name, last_name, phone)
           VALUES ($1, 'X', 'Y', '1')`,
          [WORKSHOP_A],
        ),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('no se crea un cliente en otro taller', async () => {
      await expect(
        advisorA.query(
          `INSERT INTO customers (workshop_id, first_name, last_name, phone)
           VALUES ($1, 'X', 'Y', '1')`,
          [WORKSHOP_B],
        ),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('mechanic no modifica clientes', async () => {
      const res = await mechanicA.query(`UPDATE customers SET phone = '0' WHERE id = $1`, [
        CUSTOMER_A1,
      ]);
      expect(res.rowCount).toBe(0);
    });

    it('advisor de otro taller no modifica clientes ajenos', async () => {
      const res = await advisorB.query(`UPDATE customers SET phone = '0' WHERE id = $1`, [
        CUSTOMER_A1,
      ]);
      expect(res.rowCount).toBe(0);
    });

    it('soft delete: lo hace el owner, UPDATE deleted_at, y la consulta activa lo excluye', async () => {
      await withRollback(ownerA, async () => {
        const res = await ownerA.query(`UPDATE customers SET deleted_at = now() WHERE id = $1`, [
          CUSTOMER_A2,
        ]);
        expect(res.rowCount).toBe(1);
        const { rows } = await ownerA.query(
          'SELECT id FROM customers WHERE deleted_at IS NULL ORDER BY id',
        );
        expect(rows.map((r) => r.id)).toEqual([CUSTOMER_A1]);
      });
    });

    it('nadie borra clientes con DELETE', async () => {
      const res = await ownerA.query(`DELETE FROM customers WHERE id = $1`, [CUSTOMER_A2]);
      expect(res.rowCount).toBe(0);
    });

    it('la identificación es única por taller (entre activos)', async () => {
      await withRollback(advisorA, async () => {
        await expect(
          advisorA.query(
            `INSERT INTO customers (workshop_id, first_name, last_name, phone, identification)
             VALUES ($1, 'Dup', 'Dup', '0991000009', '1700000001')`,
            [WORKSHOP_A],
          ),
        ).rejects.toThrow(/duplicate key|idx_customers_identification/i);
      });
    });

    it('la misma identificación puede existir en otro taller', async () => {
      await withRollback(advisorB, async () => {
        const res = await advisorB.query(
          `INSERT INTO customers (workshop_id, first_name, last_name, phone, identification)
           VALUES ($1, 'Otro', 'Taller', '0991000009', '1700000001')`,
          [WORKSHOP_B],
        );
        expect(res.rowCount).toBe(1);
      });
    });
  });

  describe('customers_public', () => {
    it('expone el nombre pero no los datos de contacto', async () => {
      const { rows, fields } = await mechanicA.query('SELECT * FROM customers_public');
      expect(fields.map((f) => f.name)).toEqual([
        'id',
        'workshop_id',
        'first_name',
        'last_name',
        'created_at',
        'updated_at',
        'deleted_at',
      ]);
      expect(rows.map((r) => r.id).sort()).toEqual([CUSTOMER_A1, CUSTOMER_A2]);
    });

    it('respeta el aislamiento entre talleres', async () => {
      const { rows } = await advisorB.query('SELECT id FROM customers_public');
      expect(rows.map((r) => r.id)).toEqual([CUSTOMER_B1]);
    });
  });

  describe('vehicles', () => {
    it('un miembro ve solo los vehículos de su taller', async () => {
      const a = await mechanicA.query('SELECT id FROM vehicles ORDER BY id');
      const b = await advisorB.query('SELECT id FROM vehicles');
      expect(a.rows.map((r) => r.id)).toEqual([VEHICLE_A1, VEHICLE_A2]);
      expect(b.rows.map((r) => r.id)).toEqual([VEHICLE_B1]);
    });

    it('advisor crea; mechanic no', async () => {
      const sql = `INSERT INTO vehicles (workshop_id, license_plate, make, model, year)
                   VALUES ($1, 'ZZZ-0001', 'Ford', 'Fiesta', 2015)`;
      await withRollback(advisorA, async () => {
        expect((await advisorA.query(sql, [WORKSHOP_A])).rowCount).toBe(1);
      });
      await expect(mechanicA.query(sql, [WORKSHOP_A])).rejects.toThrow(RLS_VIOLATION);
    });

    it('la placa es única por taller y reutilizable tras soft delete', async () => {
      // El owner es quien elimina (soft delete); el asesor ya no puede.
      await withRollback(ownerA, async () => {
        const dup = `INSERT INTO vehicles (workshop_id, license_plate, make, model, year)
                     VALUES ($1, 'PBA-1234', 'Ford', 'Fiesta', 2015)`;
        await ownerA.query('SAVEPOINT s');
        await expect(ownerA.query(dup, [WORKSHOP_A])).rejects.toThrow(/duplicate key/i);
        await ownerA.query('ROLLBACK TO SAVEPOINT s');

        await ownerA.query(`UPDATE vehicles SET deleted_at = now() WHERE id = $1`, [VEHICLE_A1]);
        expect((await ownerA.query(dup, [WORKSHOP_A])).rowCount).toBe(1);
      });
    });

    it('rechaza año fuera de rango y transmisión inválida', async () => {
      await withRollback(advisorA, async () => {
        await advisorA.query('SAVEPOINT s');
        await expect(
          advisorA.query(
            `INSERT INTO vehicles (workshop_id, license_plate, make, model, year)
             VALUES ($1, 'YYY-1', 'A', 'B', 1800)`,
            [WORKSHOP_A],
          ),
        ).rejects.toThrow(/vehicles_year_valid/);
        await advisorA.query('ROLLBACK TO SAVEPOINT s');
        await expect(
          advisorA.query(
            `INSERT INTO vehicles (workshop_id, license_plate, make, model, year, transmission)
             VALUES ($1, 'YYY-2', 'A', 'B', 2020, 'robot')`,
            [WORKSHOP_A],
          ),
        ).rejects.toThrow(/vehicles_transmission_valid/);
      });
    });
  });

  describe('vehicle_ownerships', () => {
    it('un miembro ve las propiedades de su taller', async () => {
      const a = await mechanicA.query('SELECT id FROM vehicle_ownerships');
      const b = await advisorB.query('SELECT id FROM vehicle_ownerships');
      expect(a.rows.map((r) => r.id)).toEqual([OWNERSHIP_A1]);
      expect(b.rows).toHaveLength(1);
    });

    it('un vehículo tiene una sola propiedad activa', async () => {
      await withRollback(advisorA, async () => {
        await expect(
          advisorA.query(
            `INSERT INTO vehicle_ownerships (workshop_id, vehicle_id, customer_id)
             VALUES ($1, $2, $3)`,
            [WORKSHOP_A, VEHICLE_A1, CUSTOMER_A2],
          ),
        ).rejects.toThrow(/duplicate key|idx_ownerships_active/i);
      });
    });

    it('cerrar la propiedad permite registrar un nuevo dueño', async () => {
      await withRollback(advisorA, async () => {
        await advisorA.query(
          `UPDATE vehicle_ownerships SET ended_at = now() + interval '1 second' WHERE id = $1`,
          [OWNERSHIP_A1],
        );
        const res = await advisorA.query(
          `INSERT INTO vehicle_ownerships (workshop_id, vehicle_id, customer_id)
           VALUES ($1, $2, $3)`,
          [WORKSHOP_A, VEHICLE_A1, CUSTOMER_A2],
        );
        expect(res.rowCount).toBe(1);
      });
    });

    it('mechanic no crea propiedades', async () => {
      await expect(
        mechanicA.query(
          `INSERT INTO vehicle_ownerships (workshop_id, vehicle_id, customer_id)
           VALUES ($1, $2, $3)`,
          [WORKSHOP_A, VEHICLE_A2, CUSTOMER_A2],
        ),
      ).rejects.toThrow(RLS_VIOLATION);
    });
  });
});
