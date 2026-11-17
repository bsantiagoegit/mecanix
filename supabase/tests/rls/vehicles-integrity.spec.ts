import { Client } from 'pg';
import { connectAsAdmin, withRollback } from '../../../src/testing/utils/db';
import { VEHICLE_A1, WORKSHOP_A, WORKSHOP_B } from '../../../src/testing/utils/seed-ids';

interface Row {
  license_plate: string;
  make: string;
  model: string;
  color: string | null;
  vin: string | null;
  transmission: string | null;
  notes: string | null;
  has_key: boolean;
  key_code: string | null;
}

/** Integridad de `vehicles`: normalización, formato de placa y VIN, y la regla de la clave. */
describe('vehicles: integridad', () => {
  let admin: Client;

  beforeAll(async () => {
    admin = await connectAsAdmin();
  });

  afterAll(async () => {
    await admin?.end();
  });

  /** Inserta un vehículo del taller A (dentro de la transacción en curso) y devuelve la fila. */
  const insert = async (over: Record<string, unknown> = {}) => {
    const v = {
      license_plate: 'QQQ-0001',
      make: 'Ford',
      model: 'Fiesta',
      year: 2015,
      color: null,
      vin: null,
      transmission: null,
      has_key: false,
      key_code: null,
      notes: null,
      ...over,
    };
    const { rows } = await admin.query<Row>(
      `INSERT INTO vehicles (workshop_id, license_plate, make, model, year, color, vin, transmission, has_key, key_code, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        WORKSHOP_A,
        v.license_plate,
        v.make,
        v.model,
        v.year,
        v.color,
        v.vin,
        v.transmission,
        v.has_key,
        v.key_code,
        v.notes,
      ],
    );
    return rows[0];
  };

  /** El INSERT debe fallar con `pattern`; el SAVEPOINT deja la transacción utilizable. */
  const rejects = async (over: Record<string, unknown>, pattern: RegExp) => {
    await admin.query('SAVEPOINT s');
    await expect(insert(over)).rejects.toThrow(pattern);
    await admin.query('ROLLBACK TO SAVEPOINT s');
  };

  describe('normalización', () => {
    it.each([
      ['qqq1234', 'QQQ-1234'],
      ['  qqq-1234  ', 'QQQ-1234'],
      ['qqq 1234', 'QQQ-1234'],
      ['QQQ-123', 'QQQ-123'],
      ['qqq123', 'QQQ-123'],
      ['ab123c', 'AB-123C'],
      ['AB-123C', 'AB-123C'],
    ])('la placa "%s" se guarda como "%s"', async (written, stored) => {
      await withRollback(admin, async () => {
        expect((await insert({ license_plate: written })).license_plate).toBe(stored);
      });
    });

    it('recorta los textos, deja NULL los opcionales vacíos y pone el VIN en mayúsculas', async () => {
      await withRollback(admin, async () => {
        const row = await insert({
          make: '  Mazda ',
          model: ' 3 ',
          color: '   ',
          vin: ' 1hgbh41jxmn109186 ',
          transmission: '',
          notes: '  ',
        });
        expect(row).toMatchObject({
          make: 'Mazda',
          model: '3',
          color: null,
          vin: '1HGBH41JXMN109186',
          transmission: null,
          notes: null,
        });
      });
    });

    it('también normaliza al actualizar', async () => {
      await withRollback(admin, async () => {
        const { rows } = await admin.query<Row>(
          `UPDATE vehicles SET license_plate = 'qqq 5678', color = ' ' WHERE id = $1 RETURNING *`,
          [VEHICLE_A1],
        );
        expect(rows[0]).toMatchObject({ license_plate: 'QQQ-5678', color: null });
      });
    });
  });

  describe('placa', () => {
    it.each(['', 'ABC', 'ABC1', 'AB-12', 'ABCD-123', 'ABC-12345', 'AB-1234', 'A1C-123', 'ÁBC-123'])(
      'rechaza "%s"',
      async (plate) => {
        await withRollback(admin, async () => {
          await rejects({ license_plate: plate }, /vehicles_license_plate_valid/);
        });
      },
    );

    it('es única por taller sin distinguir mayúsculas ni guiones', async () => {
      await withRollback(admin, async () => {
        await rejects({ license_plate: 'pba1234' }, /idx_vehicles_plate/);
        await rejects({ license_plate: 'PBA 1234' }, /idx_vehicles_plate/);
      });
    });

    it('otro taller puede usar la misma placa', async () => {
      await withRollback(admin, async () => {
        const { rowCount } = await admin.query(
          `INSERT INTO vehicles (workshop_id, license_plate, make, model, year, has_key)
           VALUES ($1, 'PBA-1234', 'Ford', 'Fiesta', 2015, false)`,
          [WORKSHOP_B],
        );
        expect(rowCount).toBe(1);
      });
    });
  });

  describe('VIN', () => {
    it('acepta 17 caracteres válidos', async () => {
      await withRollback(admin, async () => {
        expect((await insert({ vin: '1HGBH41JXMN109186' })).vin).toBe('1HGBH41JXMN109186');
      });
    });

    it.each([
      ['corto', '1HGBH41JXMN10918'],
      ['largo', '1HGBH41JXMN1091866'],
      ['con I', '1HGBH41JXMN10918I'],
      ['con O', '1HGBH41JXMN10918O'],
      ['con Q', '1HGBH41JXMN10918Q'],
      ['con símbolos', '1HGBH41JXMN10918-'],
    ])('rechaza un VIN %s', async (_label, vin) => {
      await withRollback(admin, async () => {
        await rejects({ vin }, /vehicles_vin_valid/);
      });
    });
  });

  describe('clave', () => {
    it('con clave exige key_code', async () => {
      await withRollback(admin, async () => {
        await rejects({ has_key: true, key_code: null }, /vehicles_key_code_matches_has_key/);
        await rejects({ has_key: true, key_code: '   ' }, /vehicles_key_code_matches_has_key/);
      });
    });

    it('con clave guarda el key_code recortado', async () => {
      await withRollback(admin, async () => {
        const row = await insert({ has_key: true, key_code: ' 4821 ' });
        expect(row).toMatchObject({ has_key: true, key_code: '4821' });
      });
    });

    it('sin clave limpia el key_code en lugar de rechazarlo', async () => {
      await withRollback(admin, async () => {
        const row = await insert({ has_key: false, key_code: '4821' });
        expect(row).toMatchObject({ has_key: false, key_code: null });
      });
    });

    it('al pasar a sin clave (UC-VEH-04) el key_code se limpia solo', async () => {
      await withRollback(admin, async () => {
        const { rows } = await admin.query<Row>(
          `UPDATE vehicles SET has_key = false WHERE id = $1 RETURNING *`,
          [VEHICLE_A1],
        );
        expect(rows[0]).toMatchObject({ has_key: false, key_code: null });
      });
    });

    it('al pasar a con clave sin indicarla, se rechaza', async () => {
      await withRollback(admin, async () => {
        await admin.query(`UPDATE vehicles SET has_key = false WHERE id = $1`, [VEHICLE_A1]);
        await admin.query('SAVEPOINT s');
        await expect(
          admin.query(`UPDATE vehicles SET has_key = true WHERE id = $1`, [VEHICLE_A1]),
        ).rejects.toThrow(/vehicles_key_code_matches_has_key/);
        await admin.query('ROLLBACK TO SAVEPOINT s');
      });
    });

    it('rechaza una clave de más de 50 caracteres', async () => {
      await withRollback(admin, async () => {
        await rejects({ has_key: true, key_code: 'x'.repeat(51) }, /vehicles_key_code_valid/);
      });
    });
  });

  describe('largos', () => {
    it.each([
      ['marca vacía', { make: '  ' }, /vehicles_make_valid/],
      ['marca de 61', { make: 'x'.repeat(61) }, /vehicles_make_valid/],
      ['modelo vacío', { model: '' }, /vehicles_model_valid/],
      ['modelo de 61', { model: 'x'.repeat(61) }, /vehicles_model_valid/],
      ['color de 31', { color: 'x'.repeat(31) }, /vehicles_color_valid/],
      ['notas de 501', { notes: 'x'.repeat(501) }, /vehicles_notes_valid/],
    ])('rechaza %s', async (_label, over, pattern) => {
      await withRollback(admin, async () => {
        await rejects(over, pattern);
      });
    });

    it('acepta los largos máximos', async () => {
      await withRollback(admin, async () => {
        const row = await insert({
          make: 'x'.repeat(60),
          model: 'y'.repeat(60),
          color: 'z'.repeat(30),
          notes: 'n'.repeat(500),
          has_key: true,
          key_code: 'k'.repeat(50),
        });
        expect(row.key_code).toHaveLength(50);
      });
    });
  });
});
