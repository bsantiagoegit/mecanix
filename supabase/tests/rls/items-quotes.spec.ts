import { Client } from 'pg';
import { connectAs, withRollback } from '../../../src/testing/utils/db';
import {
  CATALOG_A,
  CATALOG_B,
  ITERATION_A,
  QUOTE_A,
  QUOTE_ITEM_A,
  REPAIR_A,
  REPAIR_ITEM_A,
  SUPPLIER_A,
  SUPPLIER_B,
  USER_ADVISOR_A,
  USER_OWNER_A,
  WORKSHOP_A,
  WORKSHOP_B,
} from '../../../src/testing/utils/seed-ids';

const RLS_VIOLATION = /row-level security|policy/i;

describe('RLS: quotes, quote_items, repair_items, items_catalog, suppliers', () => {
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

  describe('quotes y quote_items (datos financieros)', () => {
    it('el mechanic no ve cotizaciones ni sus items', async () => {
      expect((await mechanicA.query('SELECT 1 FROM quotes')).rows).toEqual([]);
      expect((await mechanicA.query('SELECT 1 FROM quote_items')).rows).toEqual([]);
    });

    it('advisor y owner ven las de su taller; otro taller solo las suyas', async () => {
      for (const client of [advisorA, ownerA]) {
        expect((await client.query('SELECT id FROM quotes')).rows.map((r) => r.id)).toEqual([
          QUOTE_A,
        ]);
        expect((await client.query('SELECT id FROM quote_items')).rows.map((r) => r.id)).toEqual([
          QUOTE_ITEM_A,
        ]);
      }
      expect((await advisorB.query('SELECT id FROM quotes')).rows).toHaveLength(1);
      expect((await advisorB.query('SELECT id FROM quotes WHERE id = $1', [QUOTE_A])).rows).toEqual(
        [],
      );
    });

    it('advisor crea la cotización a su nombre; mechanic no', async () => {
      const sql = `INSERT INTO quotes (workshop_id, work_iteration_id, created_by, expires_at)
                   VALUES ($1, $2, $3, now() + interval '7 days')`;
      await withRollback(advisorA, async () => {
        // ya existe una por iteración (UNIQUE): se espera el choque, no un error de RLS
        await expect(
          advisorA.query(sql, [WORKSHOP_A, ITERATION_A, USER_ADVISOR_A]),
        ).rejects.toThrow(/duplicate key/i);
      });
      await expect(mechanicA.query(sql, [WORKSHOP_A, ITERATION_A, USER_ADVISOR_A])).rejects.toThrow(
        RLS_VIOLATION,
      );
      await expect(advisorA.query(sql, [WORKSHOP_A, ITERATION_A, USER_OWNER_A])).rejects.toThrow(
        RLS_VIOLATION,
      );
    });

    it('el borrador admite quitar items; el mechanic no los toca', async () => {
      await withRollback(advisorA, async () => {
        expect((await advisorA.query('DELETE FROM quote_items')).rowCount).toBe(1);
      });
      expect((await mechanicA.query('DELETE FROM quote_items')).rowCount).toBe(0);
    });

    it('nadie borra cotizaciones', async () => {
      expect((await ownerA.query('DELETE FROM quotes')).rowCount).toBe(0);
    });

    it('un item nuevo exige una cotización del taller', async () => {
      const sql = `INSERT INTO quote_items (quote_id, type, name, quantity, unit_cost, total_cost)
                   VALUES ($1, 'supply', 'Aceite', 2, 5, 10)`;
      await withRollback(advisorA, async () => {
        expect((await advisorA.query(sql, [QUOTE_A])).rowCount).toBe(1);
      });
      await expect(mechanicA.query(sql, [QUOTE_A])).rejects.toThrow(RLS_VIOLATION);
      await expect(advisorB.query(sql, [QUOTE_A])).rejects.toThrow(RLS_VIOLATION);
    });

    it('rechaza cantidades y costos inválidos', async () => {
      await withRollback(advisorA, async () => {
        await expect(
          advisorA.query(
            `INSERT INTO quote_items (quote_id, type, name, quantity, unit_cost, total_cost)
             VALUES ($1, 'part', 'X', 0, 1, 1)`,
            [QUOTE_A],
          ),
        ).rejects.toThrow(/quote_items_quantity_positive/);
      });
    });
  });

  describe('repair_items', () => {
    it('todos los miembros los ven; otro taller no', async () => {
      for (const client of [ownerA, advisorA, mechanicA]) {
        expect((await client.query('SELECT id FROM repair_items')).rows.map((r) => r.id)).toEqual([
          REPAIR_ITEM_A,
        ]);
      }
      expect((await advisorB.query('SELECT 1 FROM repair_items')).rows).toEqual([]);
    });

    it('mechanic y advisor crean items; otro taller no', async () => {
      const sql = `INSERT INTO repair_items
                     (workshop_id, recommended_repair_id, type, name, quantity, estimated_cost)
                   VALUES ($1, $2, 'part', 'Filtro', 1, 12)`;
      for (const client of [mechanicA, advisorA]) {
        await withRollback(client, async () => {
          expect((await client.query(sql, [WORKSHOP_A, REPAIR_A])).rowCount).toBe(1);
        });
      }
      await expect(advisorB.query(sql, [WORKSHOP_A, REPAIR_A])).rejects.toThrow(RLS_VIOLATION);
    });

    it('cualquier miembro actualiza el estado', async () => {
      await withRollback(mechanicA, async () => {
        const res = await mechanicA.query(`UPDATE repair_items SET status = 'received'`);
        expect(res.rowCount).toBe(1);
      });
    });
  });

  describe('items_catalog y suppliers', () => {
    it('todos los miembros ven su catálogo y proveedores', async () => {
      expect((await mechanicA.query('SELECT id FROM items_catalog')).rows.map((r) => r.id)).toEqual(
        [CATALOG_A],
      );
      expect((await mechanicA.query('SELECT id FROM suppliers')).rows.map((r) => r.id)).toEqual([
        SUPPLIER_A,
      ]);
      expect((await advisorB.query('SELECT id FROM items_catalog')).rows.map((r) => r.id)).toEqual([
        CATALOG_B,
      ]);
      expect((await advisorB.query('SELECT id FROM suppliers')).rows.map((r) => r.id)).toEqual([
        SUPPLIER_B,
      ]);
    });

    it('advisor y owner mantienen el catálogo; mechanic no', async () => {
      const sql = `INSERT INTO items_catalog (workshop_id, type, name) VALUES ($1, 'supply', 'Aceite')`;
      await withRollback(advisorA, async () => {
        expect((await advisorA.query(sql, [WORKSHOP_A])).rowCount).toBe(1);
        expect(
          (await advisorA.query('DELETE FROM items_catalog WHERE name = $1', ['Aceite'])).rowCount,
        ).toBe(1);
      });
      await expect(mechanicA.query(sql, [WORKSHOP_A])).rejects.toThrow(RLS_VIOLATION);
      expect((await mechanicA.query('DELETE FROM items_catalog')).rowCount).toBe(0);
    });

    it('advisor y owner mantienen proveedores; mechanic no', async () => {
      const sql = `INSERT INTO suppliers (workshop_id, name) VALUES ($1, 'Nuevo proveedor')`;
      await withRollback(ownerA, async () => {
        expect((await ownerA.query(sql, [WORKSHOP_A])).rowCount).toBe(1);
      });
      await expect(mechanicA.query(sql, [WORKSHOP_A])).rejects.toThrow(RLS_VIOLATION);
      expect(
        (await advisorB.query('DELETE FROM suppliers WHERE id = $1', [SUPPLIER_A])).rowCount,
      ).toBe(0);
    });

    it('el nombre es único por taller (y por tipo en el catálogo)', async () => {
      await withRollback(advisorA, async () => {
        await advisorA.query('SAVEPOINT s');
        await expect(
          advisorA.query(
            `INSERT INTO suppliers (workshop_id, name) VALUES ($1, 'Repuestos Quito')`,
            [WORKSHOP_A],
          ),
        ).rejects.toThrow(/duplicate key/i);
        await advisorA.query('ROLLBACK TO SAVEPOINT s');
        await expect(
          advisorA.query(
            `INSERT INTO items_catalog (workshop_id, type, name) VALUES ($1, 'part', 'Pastillas de freno')`,
            [WORKSHOP_A],
          ),
        ).rejects.toThrow(/duplicate key/i);
      });
      await withRollback(advisorB, async () => {
        expect(
          (
            await advisorB.query(
              `INSERT INTO suppliers (workshop_id, name) VALUES ($1, 'Repuestos Quito')`,
              [WORKSHOP_B],
            )
          ).rowCount,
        ).toBe(1);
      });
    });
  });
});
