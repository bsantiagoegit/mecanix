import { Client } from 'pg';
import { actAsAdmin, actAsUser, connectAsAdmin, withRollback } from '../../../src/testing/utils/db';
import {
  CUSTOMER_A1,
  USER_ADVISOR_A,
  USER_MECHANIC_A,
  USER_OWNER_A,
  VEHICLE_A1,
  WORKSHOP_A,
  WORKSHOP_B,
} from '../../../src/testing/utils/seed-ids';

const CHECK_VIOLATION = /violates check constraint/i;
const UNIQUE_VIOLATION = /duplicate key value violates unique constraint/i;
const ONLY_OWNER = /only_owner_can_delete/;

describe('Clientes: normalización, restricciones y soft delete solo del owner', () => {
  let admin: Client;

  beforeAll(async () => {
    admin = await connectAsAdmin();
  });

  afterAll(async () => {
    await admin?.end();
  });

  const insert = (
    values: Partial<
      Record<
        'first_name' | 'last_name' | 'phone' | 'email' | 'identification' | 'address',
        string | null
      >
    > = {},
    workshop = WORKSHOP_A,
  ) => {
    const v = {
      first_name: 'Ana',
      last_name: 'Pérez',
      phone: '0987654321',
      email: null,
      identification: null,
      address: null,
      ...values,
    };
    return admin.query<{ id: string }>(
      `INSERT INTO customers (workshop_id, first_name, last_name, phone, email, identification, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [workshop, v.first_name, v.last_name, v.phone, v.email, v.identification, v.address],
    );
  };

  describe('normalización', () => {
    it('recorta espacios, deja NULL los opcionales vacíos y pone la identificación en mayúsculas', async () => {
      await withRollback(admin, async () => {
        const { rows } = await insert({
          first_name: '  Ana ',
          last_name: ' Pérez  ',
          phone: ' 0987654321 ',
          email: '   ',
          identification: '  ab123x ',
          address: '',
        });
        const saved = await admin.query(`SELECT * FROM customers WHERE id = $1`, [rows[0].id]);
        expect(saved.rows[0]).toMatchObject({
          first_name: 'Ana',
          last_name: 'Pérez',
          phone: '0987654321',
          email: null,
          identification: 'AB123X',
          address: null,
        });
      });
    });

    it('también normaliza al actualizar', async () => {
      await withRollback(admin, async () => {
        await admin.query(`UPDATE customers SET identification = ' pa-99 ' WHERE id = $1`, [
          CUSTOMER_A1,
        ]);
        const { rows } = await admin.query(`SELECT identification FROM customers WHERE id = $1`, [
          CUSTOMER_A1,
        ]);
        expect(rows[0].identification).toBe('PA-99');
      });
    });
  });

  describe('identificación única por taller, sin distinguir mayúsculas', () => {
    it('rechaza la misma identificación aunque cambien las mayúsculas', async () => {
      await withRollback(admin, async () => {
        await insert({ identification: 'ab123' });
        await expect(insert({ first_name: 'Otra', identification: 'AB123' })).rejects.toThrow(
          UNIQUE_VIOLATION,
        );
      });
    });

    it('permite la misma identificación en otro taller', async () => {
      await withRollback(admin, async () => {
        await insert({ identification: 'AB123' });
        const { rowCount } = await insert({ identification: 'ab123' }, WORKSHOP_B);
        expect(rowCount).toBe(1);
      });
    });

    it('un cliente eliminado libera su identificación', async () => {
      await withRollback(admin, async () => {
        const { rows } = await insert({ identification: 'AB123' });
        await admin.query(`UPDATE customers SET deleted_at = now() WHERE id = $1`, [rows[0].id]);
        expect((await insert({ identification: 'ab123' })).rowCount).toBe(1);
      });
    });

    it('permite varios clientes sin identificación y con el mismo teléfono', async () => {
      await withRollback(admin, async () => {
        await insert({ phone: '0987654321' });
        expect((await insert({ first_name: 'Luis', phone: '0987654321' })).rowCount).toBe(1);
      });
    });
  });

  describe('restricciones de formato', () => {
    const invalid: [string, Parameters<typeof insert>[0]][] = [
      ['un nombre vacío', { first_name: '   ' }],
      ['un apellido vacío', { last_name: '' }],
      ['un nombre de más de 120 caracteres', { first_name: 'a'.repeat(121) }],
      ['un teléfono con letras', { phone: '09876abc21' }],
      ['un teléfono demasiado corto', { phone: '123456' }],
      ['un teléfono demasiado largo', { phone: '1'.repeat(21) }],
      ['un correo sin dominio', { email: 'ana@example' }],
      ['un correo con espacios', { email: 'a na@example.com' }],
      ['una identificación de más de 20 caracteres', { identification: 'A'.repeat(21) }],
      ['una dirección de más de 200 caracteres', { address: 'a'.repeat(201) }],
    ];

    it.each(invalid)('rechaza %s', async (_label, values) => {
      await withRollback(admin, async () => {
        await expect(insert(values)).rejects.toThrow(CHECK_VIOLATION);
      });
    });

    it.each(['0987654321', '+593 98 765 4321', '(02) 255-1234', '022551234'])(
      'acepta el teléfono "%s"',
      async (phone) => {
        await withRollback(admin, async () => {
          expect((await insert({ phone })).rowCount).toBe(1);
        });
      },
    );

    it('acepta los datos opcionales válidos', async () => {
      await withRollback(admin, async () => {
        const res = await insert({
          email: 'ana.perez@example.com',
          identification: 'A'.repeat(20),
          address: 'a'.repeat(200),
        });
        expect(res.rowCount).toBe(1);
      });
    });
  });

  describe('soft delete solo para el owner', () => {
    const softDelete = (table: 'customers' | 'vehicles', id: string) =>
      admin.query(`UPDATE ${table} SET deleted_at = now() WHERE id = $1`, [id]);

    it.each([
      ['customers', CUSTOMER_A1],
      ['vehicles', VEHICLE_A1],
    ] as const)('el advisor no elimina en %s', async (table, id) => {
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_ADVISOR_A);
        await expect(softDelete(table, id)).rejects.toThrow(ONLY_OWNER);
      });
    });

    it.each([
      ['customers', CUSTOMER_A1],
      ['vehicles', VEHICLE_A1],
    ] as const)('el owner elimina y restaura en %s', async (table, id) => {
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_OWNER_A);
        expect((await softDelete(table, id)).rowCount).toBe(1);
        const restored = await admin.query(`UPDATE ${table} SET deleted_at = NULL WHERE id = $1`, [
          id,
        ]);
        expect(restored.rowCount).toBe(1);
      });
    });

    it('el advisor tampoco restaura un cliente eliminado', async () => {
      await withRollback(admin, async () => {
        await softDelete('customers', CUSTOMER_A1);
        await actAsUser(admin, USER_ADVISOR_A);
        await expect(
          admin.query(`UPDATE customers SET deleted_at = NULL WHERE id = $1`, [CUSTOMER_A1]),
        ).rejects.toThrow(ONLY_OWNER);
      });
    });

    it('el advisor sí edita el resto de los campos, aunque no toque deleted_at', async () => {
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_ADVISOR_A);
        const res = await admin.query(
          `UPDATE customers SET address = 'Nueva calle 1' WHERE id = $1`,
          [CUSTOMER_A1],
        );
        expect(res.rowCount).toBe(1);
        // Reenviar el mismo valor de deleted_at no cuenta como borrar.
        const same = await admin.query(
          `UPDATE customers SET deleted_at = deleted_at WHERE id = $1`,
          [CUSTOMER_A1],
        );
        expect(same.rowCount).toBe(1);
      });
    });

    it('el mechanic no elimina', async () => {
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_MECHANIC_A);
        // La policy de UPDATE ya lo deja sin filas; el trigger no llega a ejecutarse.
        expect((await softDelete('customers', CUSTOMER_A1)).rowCount).toBe(0);
      });
    });

    it('service_role y las funciones del servidor no pasan por la restricción', async () => {
      await withRollback(admin, async () => {
        await actAsAdmin(admin);
        expect((await softDelete('customers', CUSTOMER_A1)).rowCount).toBe(1);
      });
    });
  });
});
