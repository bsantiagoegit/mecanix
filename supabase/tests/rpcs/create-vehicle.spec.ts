import { Client } from 'pg';
import { actAsUser, connectAsAdmin, withRollback } from '../../../src/testing/utils/db';
import {
  CUSTOMER_A1,
  CUSTOMER_A2,
  CUSTOMER_B1,
  USER_ADVISOR_A,
  USER_ADVISOR_B,
  USER_MECHANIC_A,
  USER_OWNER_A,
  WORKSHOP_A,
} from '../../../src/testing/utils/seed-ids';

interface VehicleRow {
  id: string;
  workshop_id: string;
  license_plate: string;
  make: string;
  year: number;
  has_key: boolean;
  key_code: string | null;
  vin: string | null;
}

/** RPC create_vehicle: alta atómica del vehículo y de su propiedad (UC-VEH-01). */
describe('RPC create_vehicle', () => {
  let admin: Client;

  beforeAll(async () => {
    admin = await connectAsAdmin();
  });

  afterAll(async () => {
    await admin?.end();
  });

  const create = async (over: Record<string, unknown> = {}) => {
    const a = {
      workshop: WORKSHOP_A,
      customer: CUSTOMER_A1,
      plate: 'qqq1234',
      make: ' Mazda ',
      model: '3',
      year: 2016,
      color: 'Azul',
      vin: '1hgbh41jxmn109186',
      transmission: 'automatic',
      hasKey: true,
      keyCode: '4821',
      notes: null,
      ...over,
    };
    return (
      await admin.query<VehicleRow>(
        `SELECT * FROM create_vehicle($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          a.workshop,
          a.customer,
          a.plate,
          a.make,
          a.model,
          a.year,
          a.color,
          a.vin,
          a.transmission,
          a.hasKey,
          a.keyCode,
          a.notes,
        ],
      )
    ).rows[0];
  };

  /** Ejecuta `fn` como `userId`, siempre con rollback. */
  const as = (userId: string, fn: () => Promise<void>) =>
    withRollback(admin, async () => {
      await actAsUser(admin, userId);
      await fn();
    });

  /** La llamada debe fallar con `pattern`; el SAVEPOINT deja la transacción utilizable. */
  const fails = async (over: Record<string, unknown>, pattern: RegExp) => {
    await admin.query('SAVEPOINT s');
    await expect(create(over)).rejects.toThrow(pattern);
    await admin.query('ROLLBACK TO SAVEPOINT s');
  };

  const counts = async () => {
    const { rows } = await admin.query<{ v: string; o: string }>(
      `SELECT (SELECT count(*) FROM vehicles)::text AS v, (SELECT count(*) FROM vehicle_ownerships)::text AS o`,
    );
    return { vehicles: Number(rows[0].v), ownerships: Number(rows[0].o) };
  };

  describe('alta', () => {
    it.each([
      ['el advisor', USER_ADVISOR_A],
      ['el owner', USER_OWNER_A],
    ])('%s crea el vehículo y su propiedad actual', async (_label, user) => {
      await as(user, async () => {
        const before = await counts();
        const vehicle = await create();

        expect(vehicle).toMatchObject({
          workshop_id: WORKSHOP_A,
          license_plate: 'QQQ-1234',
          make: 'Mazda',
          year: 2016,
          has_key: true,
          key_code: '4821',
          vin: '1HGBH41JXMN109186',
        });
        expect(await counts()).toEqual({
          vehicles: before.vehicles + 1,
          ownerships: before.ownerships + 1,
        });

        const { rows } = await admin.query(
          `SELECT customer_id, ended_at, workshop_id FROM vehicle_ownerships WHERE vehicle_id = $1`,
          [vehicle.id],
        );
        expect(rows).toEqual([
          { customer_id: CUSTOMER_A1, ended_at: null, workshop_id: WORKSHOP_A },
        ]);
      });
    });

    it('un vehículo sin clave se crea sin key_code', async () => {
      await as(USER_ADVISOR_A, async () => {
        const vehicle = await create({ hasKey: false, keyCode: null });
        expect(vehicle).toMatchObject({ has_key: false, key_code: null });
      });
    });

    it('solo la placa, la marca, el modelo y el año son obligatorios', async () => {
      await as(USER_ADVISOR_A, async () => {
        const { rows } = await admin.query<VehicleRow>(
          `SELECT * FROM create_vehicle($1, $2, 'QQQ-1111', 'Kia', 'Rio', 2020, p_has_key => false)`,
          [WORKSHOP_A, CUSTOMER_A2],
        );
        expect(rows[0].license_plate).toBe('QQQ-1111');
      });
    });
  });

  describe('atomicidad', () => {
    it('una placa repetida no deja ni vehículo ni propiedad', async () => {
      await as(USER_ADVISOR_A, async () => {
        const before = await counts();
        await fails({ plate: 'pba1234', hasKey: false, keyCode: null }, /idx_vehicles_plate/);
        expect(await counts()).toEqual(before);
      });
    });

    it('datos inválidos no dejan nada a medias', async () => {
      await as(USER_ADVISOR_A, async () => {
        const before = await counts();
        await fails({ plate: 'no es placa' }, /vehicles_license_plate_valid/);
        await fails({ hasKey: true, keyCode: null }, /vehicles_key_code_matches_has_key/);
        await fails({ year: 1800 }, /vehicles_year_valid/);
        expect(await counts()).toEqual(before);
      });
    });
  });

  describe('permisos y aislamiento', () => {
    it('el mechanic no puede crear vehículos', async () => {
      await as(USER_MECHANIC_A, async () => {
        const before = await counts();
        await fails({}, /insufficient_privilege/);
        expect(await counts()).toEqual(before);
      });
    });

    it('quien no es del taller no puede crear en él', async () => {
      await as(USER_ADVISOR_B, async () => {
        await fails({}, /insufficient_privilege/);
      });
    });

    it('no enlaza un cliente de otro taller', async () => {
      await as(USER_ADVISOR_A, async () => {
        const before = await counts();
        await fails({ customer: CUSTOMER_B1 }, /customer_not_found/);
        expect(await counts()).toEqual(before);
      });
    });

    it('no enlaza un cliente que no existe o que está eliminado', async () => {
      await as(USER_OWNER_A, async () => {
        await fails({ customer: '00000000-0000-4000-8000-0000000000ff' }, /customer_not_found/);
        await admin.query(`UPDATE customers SET deleted_at = now() WHERE id = $1`, [CUSTOMER_A2]);
        await fails({ customer: CUSTOMER_A2 }, /customer_not_found/);
      });
    });

    it('sin sesión lanza not_authenticated', async () => {
      await withRollback(admin, async () => {
        await admin.query(`SELECT set_config('request.jwt.claims', '', true)`);
        await admin.query(`SELECT set_config('request.jwt.claim.sub', '', true)`);
        await admin.query('SET LOCAL ROLE authenticated');
        await fails({}, /not_authenticated/);
      });
    });

    it('anon no puede ejecutarla', async () => {
      await withRollback(admin, async () => {
        await admin.query('SET LOCAL ROLE anon');
        await fails({}, /permission denied/);
      });
    });
  });
});
