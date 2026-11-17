import { Client } from 'pg';
import { actAsUser, connectAsAdmin, withRollback } from '../../../src/testing/utils/db';
import {
  CUSTOMER_A1,
  CUSTOMER_A2,
  USER_ADVISOR_A,
  USER_ADVISOR_B,
  USER_MECHANIC_A,
  USER_OWNER_A,
  VEHICLE_A1,
  VEHICLE_A2,
  VEHICLE_B1,
  WORKSHOP_A,
  WORKSHOP_B,
} from '../../../src/testing/utils/seed-ids';

interface Row {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  has_key: boolean;
  key_code: string | null;
  owner_id: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
}

/** RPC search_vehicles: búsqueda por placa o VIN con el propietario actual (UC-VEH-02). */
describe('RPC search_vehicles', () => {
  let admin: Client;

  beforeAll(async () => {
    admin = await connectAsAdmin();
  });

  afterAll(async () => {
    await admin?.end();
  });

  /** Vehículos extra del taller A (dentro de la transacción en curso). */
  async function seedMore() {
    await admin.query(
      `INSERT INTO vehicles (id, workshop_id, license_plate, make, model, year, vin, has_key, key_code) VALUES
         ('fa100000-0000-4000-8000-000000000001', $1, 'GAA-0001', 'Mazda',  '3',    2016, '1HGBH41JXMN109186', true,  '9999'),
         ('fa100000-0000-4000-8000-000000000002', $1, 'GAB-0002', 'Ford',   'Ka',   2012, NULL,               false, NULL),
         ('fa100000-0000-4000-8000-000000000003', $1, 'AB-123C',  'Yamaha', 'FZ',   2021, NULL,               false, NULL)`,
      [WORKSHOP_A],
    );
    // Un vehículo eliminado y otro cuya propiedad ya terminó.
    await admin.query(
      `INSERT INTO vehicles (id, workshop_id, license_plate, make, model, year, has_key, deleted_at)
       VALUES ('fa100000-0000-4000-8000-000000000004', $1, 'GAD-0004', 'Eliminado', 'X', 2010, false, now())`,
      [WORKSHOP_A],
    );
    await admin.query(
      `INSERT INTO vehicle_ownerships (workshop_id, vehicle_id, customer_id, started_at, ended_at) VALUES
         ($1, 'fa100000-0000-4000-8000-000000000001', $2, '2024-01-01', '2025-01-01'),
         ($1, 'fa100000-0000-4000-8000-000000000001', $3, '2025-01-01', NULL),
         ($1, 'fa100000-0000-4000-8000-000000000002', $2, '2025-06-01', '2026-01-01')`,
      [WORKSHOP_A, CUSTOMER_A1, CUSTOMER_A2],
    );
  }

  const search = async (
    query: string | null,
    limit?: number,
    offset?: number,
    workshop = WORKSHOP_A,
  ) =>
    (
      await admin.query<Row>(`SELECT * FROM search_vehicles($1, $2, $3, $4)`, [
        workshop,
        query,
        limit ?? 20,
        offset ?? 0,
      ])
    ).rows;

  const plates = (rows: Row[]) => rows.map((r) => r.license_plate);

  /** Ejecuta `fn` como `userId` sobre los datos extra del taller A, siempre con rollback. */
  const as = (userId: string, fn: () => Promise<void>) =>
    withRollback(admin, async () => {
      await seedMore();
      await actAsUser(admin, userId);
      await fn();
    });

  describe('por placa', () => {
    it('encuentra parte de la placa, sin distinguir mayúsculas', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(plates(await search('pba'))).toEqual(['PBA-1234', 'PBA-5678']);
        expect(plates(await search('1234'))).toEqual(['PBA-1234']);
        expect(plates(await search('Gab'))).toEqual(['GAB-0002']);
      });
    });

    it('ignora guiones y espacios, tanto en lo escrito como en la placa', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(plates(await search('pba1234'))).toEqual(['PBA-1234']);
        expect(plates(await search('PBA-1234'))).toEqual(['PBA-1234']);
        expect(plates(await search('pba 12'))).toEqual(['PBA-1234']);
        expect(plates(await search('  ab-123 c '))).toEqual(['AB-123C']);
        expect(plates(await search('ab123c'))).toEqual(['AB-123C']);
      });
    });
  });

  describe('por VIN', () => {
    it('encuentra por VIN completo o parcial', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(plates(await search('1hgbh41jxmn109186'))).toEqual(['GAA-0001']);
        expect(plates(await search('JXMN1091'))).toEqual(['GAA-0001']);
      });
    });

    it('un vehículo sin VIN no coincide por error', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(await search('zzzzzzzz')).toEqual([]);
      });
    });
  });

  describe('lista y filtros', () => {
    it('trata % y _ como texto, no como comodines', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(await search('%')).toEqual([]);
        expect(await search('_')).toEqual([]);
        expect(await search('\\')).toEqual([]);
      });
    });

    it('un texto vacío, en blanco o nulo lista todos los no eliminados', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(await search(null)).toHaveLength(5); // 2 del seed + 3 nuevos, sin el eliminado
        expect(await search('')).toHaveLength(5);
        expect(await search('  - ')).toHaveLength(5);
      });
    });

    it('excluye los vehículos eliminados', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(await search('gad')).toEqual([]);
        expect(plates(await search(null))).not.toContain('GAD-0004');
      });
    });

    it('ordena por placa', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(plates(await search(null))).toEqual([
          'AB-123C',
          'GAA-0001',
          'GAB-0002',
          'PBA-1234',
          'PBA-5678',
        ]);
      });
    });

    it('pagina con limit y offset y acota el limit', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(plates(await search(null, 2, 0))).toEqual(['AB-123C', 'GAA-0001']);
        expect(plates(await search(null, 2, 2))).toEqual(['GAB-0002', 'PBA-1234']);
        expect(plates(await search(null, 2, 4))).toEqual(['PBA-5678']);
        expect(await search(null, 0)).toHaveLength(1); // limit mínimo 1
        expect(await search(null, 1000)).toHaveLength(5);
        expect(await search(null, 2, -5)).toHaveLength(2); // offset mínimo 0
      });
    });
  });

  describe('propietario', () => {
    it('trae el propietario actual', async () => {
      await as(USER_ADVISOR_A, async () => {
        const [spark] = await search('pba1234');
        expect(spark).toMatchObject({
          owner_id: CUSTOMER_A1,
          owner_first_name: 'Carlos',
          owner_last_name: 'Cliente',
        });
      });
    });

    it('ignora las propiedades terminadas: solo cuenta la actual', async () => {
      await as(USER_ADVISOR_A, async () => {
        // GAA-0001 tuvo a Carlos y ahora es de Carla; GAB-0002 solo tuvo a Carlos, ya terminó.
        const rows = await search('gaa');
        expect(rows).toHaveLength(1);
        expect(rows[0].owner_id).toBe(CUSTOMER_A2);
        expect(rows[0].owner_first_name).toBe('Carla');
      });
    });

    it('un vehículo sin propietario actual sale con el propietario en NULL', async () => {
      await as(USER_ADVISOR_A, async () => {
        const [rio] = await search('pba5678');
        expect(rio).toMatchObject({
          owner_id: null,
          owner_first_name: null,
          owner_last_name: null,
        });
        const [ka] = await search('gab');
        expect(ka.owner_id).toBeNull();
      });
    });

    it('no trae a un propietario eliminado', async () => {
      await as(USER_OWNER_A, async () => {
        await admin.query(`UPDATE customers SET deleted_at = now() WHERE id = $1`, [CUSTOMER_A1]);
        const [spark] = await search('pba1234');
        expect(spark.owner_id).toBeNull();
      });
    });
  });

  describe('roles', () => {
    it.each([
      ['el owner', USER_OWNER_A],
      ['el advisor', USER_ADVISOR_A],
      ['el mechanic', USER_MECHANIC_A],
    ])('%s ve los mismos vehículos', async (_label, user) => {
      await as(user, async () => {
        expect(plates(await search(null))).toHaveLength(5);
      });
    });

    it('el mechanic ve el nombre del propietario pero no sus datos de contacto', async () => {
      await as(USER_MECHANIC_A, async () => {
        const [spark] = await search('pba1234');
        expect(spark.owner_first_name).toBe('Carlos');
        expect(Object.keys(spark).sort()).toEqual(
          [
            'has_key',
            'id',
            'key_code',
            'license_plate',
            'make',
            'model',
            'owner_first_name',
            'owner_id',
            'owner_last_name',
            'vin',
            'year',
          ].sort(),
        );
      });
    });

    it('todos los roles ven la clave del vehículo (D-DS-17)', async () => {
      await as(USER_MECHANIC_A, async () => {
        const [spark] = await search('pba1234');
        expect(spark).toMatchObject({ has_key: true, key_code: '4821' });
        const [rio] = await search('pba5678');
        expect(rio).toMatchObject({ has_key: false, key_code: null });
      });
    });
  });

  describe('aislamiento entre talleres', () => {
    it('un miembro del taller B solo ve los vehículos de B', async () => {
      await as(USER_ADVISOR_B, async () => {
        const rows = await search(null, 20, 0, WORKSHOP_B);
        expect(rows.map((r) => r.id)).toEqual([VEHICLE_B1]);
        expect(rows[0].owner_first_name).toBe('Bruno');
      });
    });

    it('buscar en un taller ajeno devuelve cero filas', async () => {
      await as(USER_ADVISOR_B, async () => {
        expect(await search(null, 20, 0, WORKSHOP_A)).toEqual([]);
        expect(await search('pba', 20, 0, WORKSHOP_A)).toEqual([]);
      });
    });

    it('la placa de otro taller no aparece en el propio', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(await search('abc0001')).toEqual([]);
        expect((await search(null)).map((r) => r.id)).not.toContain(VEHICLE_B1);
      });
    });

    it('los vehículos del seed siguen en su sitio', async () => {
      await as(USER_ADVISOR_A, async () => {
        const ids = (await search(null)).map((r) => r.id);
        expect(ids).toEqual(expect.arrayContaining([VEHICLE_A1, VEHICLE_A2]));
      });
    });
  });

  describe('sesión', () => {
    it('sin sesión lanza not_authenticated', async () => {
      await withRollback(admin, async () => {
        await admin.query(`SELECT set_config('request.jwt.claims', '', true)`);
        await admin.query(`SELECT set_config('request.jwt.claim.sub', '', true)`);
        await admin.query('SET LOCAL ROLE authenticated');
        await expect(search(null)).rejects.toThrow(/not_authenticated/);
      });
    });

    it('anon no puede ejecutarla', async () => {
      await withRollback(admin, async () => {
        await admin.query('SET LOCAL ROLE anon');
        await expect(search(null)).rejects.toThrow(/permission denied/);
      });
    });
  });
});
