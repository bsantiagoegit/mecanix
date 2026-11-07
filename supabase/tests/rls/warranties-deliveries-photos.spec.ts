import { Client } from 'pg';
import { connectAs, connectAsAdmin, withRollback } from '../../../src/testing/utils/db';
import {
  FINDING_A,
  PHOTO_A,
  USER_ADVISOR_A,
  USER_MECHANIC_A,
  USER_OWNER_A,
  WORK_ORDER_A,
  WORK_ORDER_B,
  WORKSHOP_A,
  WORKSHOP_B,
} from '../../../src/testing/utils/seed-ids';

const RLS_VIOLATION = /row-level security|policy/i;

describe('RLS: warranties, deliveries, photos', () => {
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

  describe('warranties', () => {
    it('el miembro del taller ve la garantía generada por el trigger', async () => {
      await withRollback(ownerA, async () => {
        await ownerA.query(`UPDATE work_orders SET status = 'completed' WHERE id = $1`, [
          WORK_ORDER_A,
        ]);
        expect((await ownerA.query('SELECT 1 FROM warranties')).rows).toHaveLength(1);
      });
    });

    it('ningún usuario inserta, modifica ni borra garantías directamente', async () => {
      await expect(
        ownerA.query(
          `INSERT INTO warranties (workshop_id, work_order_id, description, starts_at, expires_at)
           VALUES ($1, $2, 'x', now(), now() + interval '1 day')`,
          [WORKSHOP_A, WORK_ORDER_A],
        ),
      ).rejects.toThrow(RLS_VIOLATION);
      expect((await ownerA.query(`UPDATE warranties SET status = 'claimed'`)).rowCount).toBe(0);
      expect((await ownerA.query(`DELETE FROM warranties`)).rowCount).toBe(0);
    });
  });

  describe('deliveries', () => {
    const delivery = `INSERT INTO deliveries (workshop_id, work_order_id, received_by_name)
                      VALUES ($1, $2, 'Carlos Cliente')`;

    it('advisor y owner registran la entrega; mechanic no', async () => {
      for (const client of [advisorA, ownerA]) {
        await withRollback(client, async () => {
          expect((await client.query(delivery, [WORKSHOP_A, WORK_ORDER_A])).rowCount).toBe(1);
        });
      }
      await expect(mechanicA.query(delivery, [WORKSHOP_A, WORK_ORDER_A])).rejects.toThrow(
        RLS_VIOLATION,
      );
    });

    it('una orden se entrega una sola vez, sin edición posterior', async () => {
      await withRollback(advisorA, async () => {
        await advisorA.query(delivery, [WORKSHOP_A, WORK_ORDER_A]);
        await advisorA.query('SAVEPOINT s');
        await expect(advisorA.query(delivery, [WORKSHOP_A, WORK_ORDER_A])).rejects.toThrow(
          /duplicate key/i,
        );
        await advisorA.query('ROLLBACK TO SAVEPOINT s');
        expect((await advisorA.query(`UPDATE deliveries SET notes = 'x'`)).rowCount).toBe(0);
        expect((await advisorA.query(`DELETE FROM deliveries`)).rowCount).toBe(0);
      });
    });

    it('no se registra una entrega en otro taller', async () => {
      await expect(advisorB.query(delivery, [WORKSHOP_A, WORK_ORDER_A])).rejects.toThrow(
        RLS_VIOLATION,
      );
      await withRollback(advisorB, async () => {
        expect((await advisorB.query(delivery, [WORKSHOP_B, WORK_ORDER_B])).rowCount).toBe(1);
      });
    });
  });

  describe('photos', () => {
    const photo = `INSERT INTO photos
                     (workshop_id, uploaded_by, entity_type, entity_id, storage_path, mime_type, size_bytes)
                   VALUES ($1, $2, 'finding', $3, $4, 'image/jpeg', 1000)`;
    const path = `${WORKSHOP_A}/finding/${FINDING_A}/nueva.jpg`;

    it('todos los miembros ven las fotos de su taller; otro taller no', async () => {
      for (const client of [ownerA, advisorA, mechanicA]) {
        expect((await client.query('SELECT id FROM photos')).rows.map((r) => r.id)).toEqual([
          PHOTO_A,
        ]);
      }
      expect((await advisorB.query('SELECT 1 FROM photos')).rows).toEqual([]);
    });

    it('cualquier miembro sube fotos a su nombre', async () => {
      for (const [client, userId] of [
        [mechanicA, USER_MECHANIC_A],
        [advisorA, USER_ADVISOR_A],
        [ownerA, USER_OWNER_A],
      ] as const) {
        await withRollback(client, async () => {
          expect((await client.query(photo, [WORKSHOP_A, userId, FINDING_A, path])).rowCount).toBe(
            1,
          );
        });
      }
    });

    it('no se sube a nombre de otro ni a otro taller', async () => {
      await expect(
        mechanicA.query(photo, [WORKSHOP_A, USER_OWNER_A, FINDING_A, path]),
      ).rejects.toThrow(RLS_VIOLATION);
      await expect(
        advisorB.query(photo, [WORKSHOP_A, USER_ADVISOR_A, FINDING_A, path]),
      ).rejects.toThrow(RLS_VIOLATION);
    });

    it('las fotos no se modifican ni se borran en el MVP', async () => {
      expect((await ownerA.query(`UPDATE photos SET caption = 'x'`)).rowCount).toBe(0);
      expect((await ownerA.query(`DELETE FROM photos`)).rowCount).toBe(0);
    });

    it('rechaza tipos MIME y tamaños inválidos', async () => {
      await withRollback(mechanicA, async () => {
        await mechanicA.query('SAVEPOINT s');
        await expect(
          mechanicA.query(
            `INSERT INTO photos (workshop_id, uploaded_by, entity_type, entity_id, storage_path, mime_type, size_bytes)
             VALUES ($1, $2, 'finding', $3, 'p', 'application/pdf', 10)`,
            [WORKSHOP_A, USER_MECHANIC_A, FINDING_A],
          ),
        ).rejects.toThrow(/photos_mime_valid/);
        await mechanicA.query('ROLLBACK TO SAVEPOINT s');
        await expect(
          mechanicA.query(
            `INSERT INTO photos (workshop_id, uploaded_by, entity_type, entity_id, storage_path, mime_type, size_bytes)
             VALUES ($1, $2, 'finding', $3, 'p', 'image/png', 0)`,
            [WORKSHOP_A, USER_MECHANIC_A, FINDING_A],
          ),
        ).rejects.toThrow(/photos_size_positive/);
      });
    });
  });

  describe('storage: bucket photos', () => {
    let admin: Client;
    let storageAvailable = false;

    beforeAll(async () => {
      admin = await connectAsAdmin();
      const { rows } = await admin.query(`SELECT to_regclass('storage.buckets') AS t`);
      storageAvailable = rows[0].t !== null;
    });

    afterAll(async () => {
      await admin?.end();
    });

    it('el bucket es privado, con límite de 5 MB y solo imágenes', async (ctx) => {
      if (!storageAvailable) return ctx.skip();
      const { rows } = await admin.query(
        `SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'photos'`,
      );
      expect({ ...rows[0], file_size_limit: Number(rows[0].file_size_limit) }).toEqual({
        public: false,
        file_size_limit: 5242880,
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
      });
    });

    it('un miembro sube a la carpeta de su taller y no a la de otro', async (ctx) => {
      if (!storageAvailable) return ctx.skip();
      const insert = `INSERT INTO storage.objects (bucket_id, name, owner_id)
                      VALUES ('photos', $1, $2)`;
      await withRollback(mechanicA, async () => {
        const ok = await mechanicA.query(insert, [
          `${WORKSHOP_A}/finding/x/ok.jpg`,
          USER_MECHANIC_A,
        ]);
        expect(ok.rowCount).toBe(1);
      });
      await expect(
        mechanicA.query(insert, [`${WORKSHOP_B}/finding/x/no.jpg`, USER_MECHANIC_A]),
      ).rejects.toThrow(RLS_VIOLATION);
    });
  });
});
