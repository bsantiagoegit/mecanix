import { Client } from 'pg';
import { actAsAdmin, actAsUser, connectAsAdmin, withRollback } from '../../../src/testing/utils/db';
import {
  CUSTOMER_A1,
  CUSTOMER_A2,
  CUSTOMER_B1,
  USER_ADVISOR_A,
  USER_ADVISOR_B,
  USER_MECHANIC_A,
  USER_OWNER_A,
  WORKSHOP_A,
  WORKSHOP_B,
} from '../../../src/testing/utils/seed-ids';

interface Row {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  identification: string | null;
}

describe('RPC search_customers', () => {
  let admin: Client;

  beforeAll(async () => {
    admin = await connectAsAdmin();
  });

  afterAll(async () => {
    await admin?.end();
  });

  /** Clientes extra del taller A para las búsquedas (dentro de la transacción en curso). */
  async function seedMore() {
    await admin.query(
      `INSERT INTO customers (workshop_id, first_name, last_name, phone, email, identification) VALUES
         ($1, 'Ana',   'Pérez',  '0987654321', 'ana@example.com', 'AB123X'),
         ($1, 'Juan',  'Pérez',  '0981112233', NULL, NULL),
         ($1, 'María Ana', 'Torres', '0974445566', NULL, '1712345678'),
         ($1, 'Pedro', 'Cien%',  '0970000001', NULL, NULL),
         ($1, 'Rosa',  'Un_derscore', '0970000002', NULL, NULL)`,
      [WORKSHOP_A],
    );
    await admin.query(
      `INSERT INTO customers (workshop_id, first_name, last_name, phone, deleted_at)
       VALUES ($1, 'Eliminado', 'Pérez', '0960000000', now())`,
      [WORKSHOP_A],
    );
  }

  const search = async (
    query: string | null,
    limit?: number,
    offset?: number,
    workshop = WORKSHOP_A,
  ) =>
    (
      await admin.query<Row>(`SELECT * FROM search_customers($1, $2, $3, $4)`, [
        workshop,
        query,
        limit ?? 20,
        offset ?? 0,
      ])
    ).rows;

  const names = (rows: Row[]) => rows.map((r) => `${r.first_name} ${r.last_name}`);

  /** Ejecuta `fn` como `userId` sobre los datos extra del taller A, siempre con rollback. */
  const as = (userId: string, fn: () => Promise<void>) =>
    withRollback(admin, async () => {
      await seedMore();
      await actAsUser(admin, userId);
      await fn();
    });

  describe('owner y advisor', () => {
    it.each([
      ['el owner', USER_OWNER_A],
      ['el advisor', USER_ADVISOR_A],
    ])('%s busca por nombre, apellido, teléfono e identificación', async (_l, user) => {
      await as(user, async () => {
        expect(names(await search('torres'))).toEqual(['María Ana Torres']);
        expect(names(await search('0981112'))).toEqual(['Juan Pérez']);
        expect(names(await search('ab123x'))).toEqual(['Ana Pérez']);
        expect(names(await search('171234'))).toEqual(['María Ana Torres']);
      });
    });

    it('devuelve el contacto completo', async () => {
      await as(USER_ADVISOR_A, async () => {
        const [ana] = await search('ab123x');
        expect(ana).toMatchObject({
          phone: '0987654321',
          email: 'ana@example.com',
          identification: 'AB123X',
        });
      });
    });

    it('no distingue mayúsculas y encuentra el texto en cualquier parte del campo', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(names(await search('PÉREZ')).sort()).toEqual(['Ana Pérez', 'Juan Pérez']);
        expect(names(await search('ez'))).toContain('Juan Pérez');
      });
    });

    it('todas las palabras deben coincidir, cada una en cualquier campo', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(names(await search('ana pérez'))).toEqual(['Ana Pérez']);
        // "ana" también está en "María Ana", pero "pérez" no.
        expect(names(await search('ana torres'))).toEqual(['María Ana Torres']);
        expect(names(await search('ana 0987'))).toEqual(['Ana Pérez']);
        expect(await search('ana inexistente')).toEqual([]);
      });
    });

    it('no ignora las tildes en el MVP', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(await search('Perez')).toEqual([]);
      });
    });

    it('trata % y _ como texto, no como comodines', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(names(await search('%'))).toEqual(['Pedro Cien%']);
        expect(names(await search('_'))).toEqual(['Rosa Un_derscore']);
        expect(names(await search('n_d'))).toEqual(['Rosa Un_derscore']);
        expect(await search('\\')).toEqual([]);
      });
    });

    it('un texto vacío, en blanco o nulo lista todo', async () => {
      await as(USER_ADVISOR_A, async () => {
        const all = await search(null);
        expect(all).toHaveLength(7); // 2 del seed + 5 nuevos, sin el eliminado
        expect(await search('')).toHaveLength(7);
        expect(await search('    ')).toHaveLength(7);
      });
    });

    it('excluye los clientes eliminados', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(names(await search('eliminado'))).toEqual([]);
        expect(names(await search(null))).not.toContain('Eliminado Pérez');
      });
    });

    it('ordena por apellido, nombre e id', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(names(await search(null))).toEqual([
          'Pedro Cien%',
          'Carlos Cliente',
          'Carla Compradora',
          'Ana Pérez',
          'Juan Pérez',
          'María Ana Torres',
          'Rosa Un_derscore',
        ]);
      });
    });

    it('pagina con limit y offset y acota el limit', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(names(await search(null, 3, 0))).toEqual([
          'Pedro Cien%',
          'Carlos Cliente',
          'Carla Compradora',
        ]);
        expect(names(await search(null, 3, 3))).toEqual([
          'Ana Pérez',
          'Juan Pérez',
          'María Ana Torres',
        ]);
        expect(names(await search(null, 3, 6))).toEqual(['Rosa Un_derscore']);
        expect(await search(null, 3, 50)).toEqual([]);
        // Valores fuera de rango se acotan: 0 y negativos -> 1; más de 100 -> 100.
        expect(await search(null, 0, 0)).toHaveLength(1);
        expect(await search(null, -5, -5)).toHaveLength(1);
        expect(await search(null, 100000, 0)).toHaveLength(7);
      });
    });

    it('limita el texto a 5 palabras y 100 caracteres sin fallar', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(await search('ana '.repeat(40))).toBeDefined();
        expect(names(await search('ana ana ana ana ana ana ana ana'))).toContain('Ana Pérez');
      });
    });
  });

  describe('mechanic', () => {
    it('busca solo por nombre y apellido', async () => {
      await as(USER_MECHANIC_A, async () => {
        expect(names(await search('torres'))).toEqual(['María Ana Torres']);
        expect(names(await search('ana pérez'))).toEqual(['Ana Pérez']);
      });
    });

    it('no encuentra por teléfono ni por identificación', async () => {
      await as(USER_MECHANIC_A, async () => {
        expect(await search('0987654321')).toEqual([]);
        expect(await search('ab123x')).toEqual([]);
        expect(await search('1712345678')).toEqual([]);
      });
    });

    it('recibe teléfono, email e identificación en NULL', async () => {
      await as(USER_MECHANIC_A, async () => {
        const rows = await search(null);
        expect(rows).toHaveLength(7);
        for (const r of rows) {
          expect(r.phone).toBeNull();
          expect(r.email).toBeNull();
          expect(r.identification).toBeNull();
        }
      });
    });
  });

  describe('aislamiento y acceso', () => {
    it('un miembro de otro taller no ve clientes del taller A', async () => {
      await as(USER_ADVISOR_B, async () => {
        expect(await search(null, 20, 0, WORKSHOP_A)).toEqual([]);
        expect(await search('pérez', 20, 0, WORKSHOP_A)).toEqual([]);
      });
    });

    it('cada taller ve solo los suyos', async () => {
      await as(USER_ADVISOR_B, async () => {
        expect((await search(null, 20, 0, WORKSHOP_B)).map((r) => r.id)).toEqual([CUSTOMER_B1]);
      });
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_ADVISOR_A);
        expect((await search(null)).map((r) => r.id).sort()).toEqual(
          [CUSTOMER_A1, CUSTOMER_A2].sort(),
        );
      });
    });

    it('un taller inexistente no devuelve nada ni falla', async () => {
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_ADVISOR_A);
        expect(await search(null, 20, 0, '00000000-0000-4000-8000-000000000000')).toEqual([]);
      });
    });

    it('un miembro desactivado ya no busca', async () => {
      await withRollback(admin, async () => {
        await admin.query(`UPDATE workshop_members SET status = 'inactive' WHERE user_id = $1`, [
          USER_ADVISOR_A,
        ]);
        await actAsUser(admin, USER_ADVISOR_A);
        expect(await search(null)).toEqual([]);
      });
    });

    it('sin sesión se rechaza', async () => {
      await withRollback(admin, async () => {
        await admin.query(`SELECT set_config('request.jwt.claims', '', true)`);
        await admin.query(`SELECT set_config('request.jwt.claim.sub', '', true)`);
        await admin.query('SET LOCAL ROLE authenticated');
        await expect(search(null)).rejects.toThrow(/not_authenticated/);
      });
    });

    it('anon no puede ejecutarla', async () => {
      await withRollback(admin, async () => {
        await actAsAdmin(admin);
        await admin.query('SET LOCAL ROLE anon');
        await expect(search(null)).rejects.toThrow(/permission denied/i);
      });
    });

    it('el texto buscado viaja como parámetro: no se puede inyectar SQL', async () => {
      await as(USER_ADVISOR_A, async () => {
        expect(await search(`x') OR true --`)).toEqual([]);
        expect(await search(`'; DROP TABLE customers; --`)).toEqual([]);
        expect((await search(null)).length).toBeGreaterThan(0);
      });
    });
  });
});
