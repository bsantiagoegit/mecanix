import { Client } from 'pg';
import { connectAs, connectAsAdmin, withRollback } from '../../../src/testing/utils/db';
import {
  CATALOG_A,
  CATALOG_B,
  CUSTOMER_A1,
  CUSTOMER_A2,
  CUSTOMER_B1,
  FINDING_A,
  INSPECTION_A,
  ITERATION_B,
  OWNERSHIP_A1,
  QUOTE_A,
  QUOTE_ITEM_A,
  REPAIR_A,
  REPAIR_B,
  REPAIR_ITEM_A,
  SUPPLIER_A,
  SUPPLIER_B,
  USER_ADVISOR_A,
  USER_ADVISOR_B,
  USER_MECHANIC_A,
  USER_OWNER_B,
  WORKSHOP_A,
  VEHICLE_B1,
  WORK_ORDER_A,
} from '../../../src/testing/utils/seed-ids';

const FK_VIOLATION = /violates foreign key constraint/i;
const CROSS_WORKSHOP = /cross_workshop_reference/;

/**
 * Las referencias entre filas no pueden cruzar de un taller a otro. Se prueba como `postgres`
 * (bypassa la RLS, igual que `service_role` o una función SECURITY DEFINER): la garantía
 * la da la propia base de datos, no solo las policies.
 */
describe('Aislamiento entre talleres: referencias y datos de contacto', () => {
  let admin: Client;

  beforeAll(async () => {
    admin = await connectAsAdmin();
  });

  afterAll(async () => {
    await admin?.end();
  });

  describe('claves foráneas compuestas (workshop_id, id)', () => {
    const crossing: [string, string, unknown[]][] = [
      [
        'vehicle_ownerships.vehicle_id apunta a un vehículo de otro taller',
        // Propiedad ya cerrada: así no choca con el índice de "una propiedad activa por vehículo".
        `INSERT INTO vehicle_ownerships (workshop_id, vehicle_id, customer_id, started_at, ended_at)
         VALUES ('${WORKSHOP_A}', $1, $2, '2020-01-01', '2021-01-01')`,
        [VEHICLE_B1, CUSTOMER_A1],
      ],
      [
        'vehicle_ownerships.customer_id apunta a un cliente de otro taller',
        `UPDATE vehicle_ownerships SET customer_id = $1 WHERE id = $2`,
        [CUSTOMER_B1, OWNERSHIP_A1],
      ],
      [
        'work_orders.customer_id apunta a un cliente de otro taller',
        `UPDATE work_orders SET customer_id = $1 WHERE id = $2`,
        [CUSTOMER_B1, WORK_ORDER_A],
      ],
      [
        'work_orders.vehicle_id apunta a un vehículo de otro taller',
        `UPDATE work_orders SET vehicle_id = $1 WHERE id = $2`,
        [VEHICLE_B1, WORK_ORDER_A],
      ],
      [
        'inspections.work_iteration_id apunta a una iteración de otro taller',
        `UPDATE inspections SET work_iteration_id = $1 WHERE id = $2`,
        [ITERATION_B, INSPECTION_A],
      ],
      [
        'recommended_repairs.work_iteration_id apunta a una iteración de otro taller',
        `UPDATE recommended_repairs SET work_iteration_id = $1 WHERE id = $2`,
        [ITERATION_B, REPAIR_A],
      ],
      [
        'repair_items.supplier_id apunta a un proveedor de otro taller',
        `UPDATE repair_items SET supplier_id = $1 WHERE id = $2`,
        [SUPPLIER_B, REPAIR_ITEM_A],
      ],
      [
        'repair_items.item_catalog_id apunta a un ítem de catálogo de otro taller',
        `UPDATE repair_items SET item_catalog_id = $1 WHERE id = $2`,
        [CATALOG_B, REPAIR_ITEM_A],
      ],
    ];

    it.each(crossing)('rechaza: %s', async (_label, sql, params) => {
      await withRollback(admin, async () => {
        await expect(admin.query(sql, params)).rejects.toThrow(FK_VIOLATION);
      });
    });

    it('acepta las mismas referencias cuando son del propio taller', async () => {
      await withRollback(admin, async () => {
        expect(
          (
            await admin.query(`UPDATE work_orders SET customer_id = $1 WHERE id = $2`, [
              CUSTOMER_A2,
              WORK_ORDER_A,
            ])
          ).rowCount,
        ).toBe(1);
        expect(
          (
            await admin.query(`UPDATE repair_items SET supplier_id = $1 WHERE id = $2`, [
              SUPPLIER_A,
              REPAIR_ITEM_A,
            ])
          ).rowCount,
        ).toBe(1);
      });
    });

    it('una referencia opcional puede quedar vacía', async () => {
      await withRollback(admin, async () => {
        expect(
          (
            await admin.query(`UPDATE repair_items SET supplier_id = NULL WHERE id = $1`, [
              REPAIR_ITEM_A,
            ])
          ).rowCount,
        ).toBe(1);
      });
    });

    it('no existe ninguna FK de una sola columna entre dos tablas con workshop_id', async () => {
      // Guarda para las tablas futuras: toda referencia entre tablas del taller debe incluir workshop_id.
      const { rows } = await admin.query<{ child: string; parent: string; col: string }>(`
        SELECT c.conrelid::regclass::text AS child, c.confrelid::regclass::text AS parent, a.attname AS col
          FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
         WHERE c.contype = 'f'
           AND c.connamespace = 'public'::regnamespace
           AND array_length(c.conkey, 1) = 1
           AND a.attname <> 'workshop_id'
           AND EXISTS (SELECT 1 FROM pg_attribute w WHERE w.attrelid = c.conrelid
                        AND w.attname = 'workshop_id' AND NOT w.attisdropped)
           AND EXISTS (SELECT 1 FROM pg_attribute w WHERE w.attrelid = c.confrelid
                        AND w.attname = 'workshop_id' AND NOT w.attisdropped)`);
      expect(rows).toEqual([]);
    });
  });

  describe('personas de la fila: deben ser miembros del mismo taller', () => {
    const outsiders: [string, string, unknown[]][] = [
      [
        'work_orders.advisor_id',
        `UPDATE work_orders SET advisor_id = $1 WHERE id = $2`,
        [USER_ADVISOR_B, WORK_ORDER_A],
      ],
      [
        'inspections.mechanic_id',
        `UPDATE inspections SET mechanic_id = $1 WHERE id = $2`,
        [USER_ADVISOR_B, INSPECTION_A],
      ],
      [
        'quotes.created_by',
        `UPDATE quotes SET created_by = $1 WHERE id = $2`,
        [USER_OWNER_B, QUOTE_A],
      ],
    ];

    it.each(outsiders)('rechaza un usuario de otro taller en %s', async (_label, sql, params) => {
      await withRollback(admin, async () => {
        await expect(admin.query(sql, params)).rejects.toThrow(FK_VIOLATION);
      });
    });

    it('acepta a otro miembro del mismo taller', async () => {
      await withRollback(admin, async () => {
        const res = await admin.query(`UPDATE inspections SET mechanic_id = $1 WHERE id = $2`, [
          USER_MECHANIC_A,
          INSPECTION_A,
        ]);
        expect(res.rowCount).toBe(1);
      });
    });

    it('desactivar a un miembro no rompe las filas que ya lo mencionan', async () => {
      await withRollback(admin, async () => {
        const res = await admin.query(
          `UPDATE workshop_members SET status = 'inactive' WHERE user_id = $1`,
          [USER_ADVISOR_A],
        );
        expect(res.rowCount).toBe(1);
      });
    });

    it('ninguna tabla del taller referencia a users sin pasar por la membresía (salvo las conocidas)', async () => {
      const { rows } = await admin.query<{ child: string; col: string }>(`
        SELECT c.conrelid::regclass::text AS child, a.attname AS col
          FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
         WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
           AND c.confrelid = 'users'::regclass
           AND c.conrelid::regclass::text <> 'workshop_members'
           AND EXISTS (SELECT 1 FROM pg_attribute w WHERE w.attrelid = c.conrelid
                        AND w.attname = 'workshop_id' AND NOT w.attisdropped)`);
      // photos.uploaded_by lo fija la RLS (= auth.uid()); status_history.actor_id lo fija un trigger.
      expect(rows.map((r) => `${r.child}.${r.col}`).sort()).toEqual(['photos.uploaded_by']);
    });
  });

  describe('tablas de unión sin workshop_id', () => {
    it('repair_findings rechaza unir elementos de talleres distintos', async () => {
      await withRollback(admin, async () => {
        await expect(
          admin.query(
            `INSERT INTO repair_findings (recommended_repair_id, finding_id) VALUES ($1, $2)`,
            [REPAIR_B, FINDING_A],
          ),
        ).rejects.toThrow(CROSS_WORKSHOP);
      });
    });

    it('repair_findings acepta elementos del mismo taller', async () => {
      await withRollback(admin, async () => {
        const res = await admin.query(
          `INSERT INTO repair_findings (recommended_repair_id, finding_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [REPAIR_A, FINDING_A],
        );
        expect(res.rowCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('quote_items rechaza un ítem de catálogo de otro taller, al insertar y al actualizar', async () => {
      await withRollback(admin, async () => {
        await expect(
          admin.query(
            `INSERT INTO quote_items (quote_id, item_catalog_id, type, name, quantity, unit_cost, total_cost)
             VALUES ($1, $2, 'part', 'X', 1, 1, 1)`,
            [QUOTE_A, CATALOG_B],
          ),
        ).rejects.toThrow(CROSS_WORKSHOP);
      });
      await withRollback(admin, async () => {
        await expect(
          admin.query(`UPDATE quote_items SET item_catalog_id = $1 WHERE id = $2`, [
            CATALOG_B,
            QUOTE_ITEM_A,
          ]),
        ).rejects.toThrow(CROSS_WORKSHOP);
      });
    });

    it('quote_items acepta un ítem del mismo taller y uno sin catálogo', async () => {
      await withRollback(admin, async () => {
        await admin.query(
          `INSERT INTO quote_items (quote_id, item_catalog_id, type, name, quantity, unit_cost, total_cost)
           VALUES ($1, $2, 'part', 'X', 1, 1, 1)`,
          [QUOTE_A, CATALOG_A],
        );
        const res = await admin.query(
          `INSERT INTO quote_items (quote_id, item_catalog_id, type, name, quantity, unit_cost, total_cost)
           VALUES ($1, NULL, 'part', 'Libre', 1, 1, 1)`,
          [QUOTE_A],
        );
        expect(res.rowCount).toBe(1);
      });
    });
  });

  describe('customers: datos de contacto solo para owner y advisor', () => {
    let owner: Client;
    let advisor: Client;
    let mechanic: Client;

    beforeAll(async () => {
      [owner, advisor, mechanic] = await Promise.all([
        connectAs('owner@workshop-a.com'),
        connectAs('advisor@workshop-a.com'),
        connectAs('mechanic@workshop-a.com'),
      ]);
    });

    afterAll(async () => {
      await Promise.all([owner, advisor, mechanic].map((c) => c?.end()));
    });

    it('owner y advisor leen customers con sus datos de contacto', async () => {
      for (const client of [owner, advisor]) {
        const { rows } = await client.query('SELECT id, phone, email FROM customers ORDER BY id');
        expect(rows.map((r) => r.id)).toEqual([CUSTOMER_A1, CUSTOMER_A2]);
        expect(rows[0].phone).toBeTruthy();
      }
    });

    it('el mechanic no lee customers directamente: ve cero filas', async () => {
      const { rows } = await mechanic.query('SELECT * FROM customers');
      expect(rows).toEqual([]);
    });

    it('el mechanic ve el nombre por customers_public y no puede pedir el contacto', async () => {
      const { rows } = await mechanic.query('SELECT id, first_name FROM customers_public');
      expect(rows.map((r) => r.id).sort()).toEqual([CUSTOMER_A1, CUSTOMER_A2]);
      await expect(mechanic.query('SELECT phone FROM customers_public')).rejects.toThrow(
        /column .* does not exist/i,
      );
    });

    it('un cliente borrado lógicamente se sigue pudiendo marcar (UPDATE) por el advisor', async () => {
      await withRollback(advisor, async () => {
        const res = await advisor.query(`UPDATE customers SET deleted_at = now() WHERE id = $1`, [
          CUSTOMER_A2,
        ]);
        expect(res.rowCount).toBe(1);
      });
    });

    it('anon no puede leer customers_public', async () => {
      const anon = await connectAsAdmin();
      try {
        await anon.query('SET ROLE anon');
        await expect(anon.query('SELECT * FROM customers_public')).rejects.toThrow(
          /permission denied/i,
        );
      } finally {
        await anon.end();
      }
    });

    it('el mechanic no ve clientes de otro taller ni por la vista', async () => {
      const { rows } = await mechanic.query(`SELECT id FROM customers_public WHERE id = $1`, [
        CUSTOMER_B1,
      ]);
      expect(rows).toEqual([]);
    });
  });
});
