import { Client } from 'pg';
import { environment } from '../../../src/environments/environment';
import { actAsAdmin, actAsUser, connectAsAdmin, withRollback } from '../../../src/testing/utils/db';
import {
  USER_ADVISOR_A,
  USER_MECHANIC_A,
  USER_OWNER_A,
  USER_OWNER_B,
  WORKSHOP_A,
  WORKSHOP_B,
} from '../../../src/testing/utils/seed-ids';

const RLS_VIOLATION = /row-level security|policy/i;
const LOGO_URL = 'http://127.0.0.1:54321/storage/v1/object/public/logos/a/logo.png';

describe('Logo del taller: workshops.logo_url y bucket logos', () => {
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

  const setLogo = (value: string | null) =>
    admin.query(`UPDATE workshops SET logo_url = $1 WHERE id = $2`, [value, WORKSHOP_A]);

  describe('workshops.logo_url', () => {
    it('el owner guarda y quita el logo', async () => {
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_OWNER_A);
        expect((await setLogo(LOGO_URL)).rowCount).toBe(1);
        const { rows } = await admin.query(`SELECT logo_url FROM workshops WHERE id = $1`, [
          WORKSHOP_A,
        ]);
        expect(rows[0].logo_url).toBe(LOGO_URL);
        expect((await setLogo(null)).rowCount).toBe(1);
      });
    });

    it.each([
      ['un esquema javascript', 'javascript:alert(1)'],
      ['un data URI', 'data:image/png;base64,AAAA'],
      ['una ruta relativa', '/logos/a.png'],
      ['una URL demasiado larga', `https://x.com/${'a'.repeat(2100)}`],
    ])('rechaza %s', async (_label, value) => {
      await withRollback(admin, async () => {
        await expect(setLogo(value)).rejects.toThrow(/workshops_logo_url_valid/);
      });
    });

    it('solo el owner cambia el logo: advisor y mechanic no', async () => {
      for (const user of [USER_ADVISOR_A, USER_MECHANIC_A]) {
        await withRollback(admin, async () => {
          await actAsUser(admin, user);
          expect((await setLogo(LOGO_URL)).rowCount).toBe(0);
        });
      }
    });

    it('el owner de otro taller no cambia el logo ajeno', async () => {
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_OWNER_B);
        expect((await setLogo(LOGO_URL)).rowCount).toBe(0);
      });
    });
  });

  describe('bucket logos (requiere el esquema storage)', () => {
    const insertSql = `INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('logos', $1, $2)`;
    const fileA = `${WORKSHOP_A}/3f2a9c1e-0000-4000-8000-000000000001.png`;
    const fileB = `${WORKSHOP_B}/3f2a9c1e-0000-4000-8000-000000000002.png`;

    /** Deja un logo en cada taller (como postgres) para probar lectura y borrado. */
    const seedObjects = async () => {
      await admin.query(insertSql, [fileA, USER_OWNER_A]);
      await admin.query(insertSql, [fileB, USER_OWNER_B]);
    };

    it('es público, de 1 MB y solo admite imágenes', async (ctx) => {
      if (!storageAvailable) return ctx.skip();
      const { rows } = await admin.query(
        `SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'logos'`,
      );
      expect({ ...rows[0], file_size_limit: Number(rows[0].file_size_limit) }).toEqual({
        public: true,
        file_size_limit: 1048576,
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
      });
    });

    it('el owner sube un logo a la carpeta de su taller', async (ctx) => {
      if (!storageAvailable) return ctx.skip();
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_OWNER_A);
        expect((await admin.query(insertSql, [fileA, USER_OWNER_A])).rowCount).toBe(1);
      });
    });

    it('advisor y mechanic no suben logos', async (ctx) => {
      if (!storageAvailable) return ctx.skip();
      for (const user of [USER_ADVISOR_A, USER_MECHANIC_A]) {
        await withRollback(admin, async () => {
          await actAsUser(admin, user);
          await expect(admin.query(insertSql, [fileA, user])).rejects.toThrow(RLS_VIOLATION);
        });
      }
    });

    it('un owner no sube a la carpeta de otro taller', async (ctx) => {
      if (!storageAvailable) return ctx.skip();
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_OWNER_A);
        await expect(admin.query(insertSql, [fileB, USER_OWNER_A])).rejects.toThrow(RLS_VIOLATION);
      });
    });

    it('una ruta sin UUID de taller no se acepta', async (ctx) => {
      if (!storageAvailable) return ctx.skip();
      await withRollback(admin, async () => {
        await actAsUser(admin, USER_OWNER_A);
        await expect(
          admin.query(insertSql, ['no-es-un-uuid/logo.png', USER_OWNER_A]),
        ).rejects.toThrow();
      });
    });

    it('cada owner solo ve los logos de su taller', async (ctx) => {
      if (!storageAvailable) return ctx.skip();
      await withRollback(admin, async () => {
        await seedObjects();
        await actAsUser(admin, USER_OWNER_A);
        const a = await admin.query(`SELECT name FROM storage.objects WHERE bucket_id = 'logos'`);
        expect(a.rows.map((r) => r.name)).toEqual([fileA]);

        await actAsAdmin(admin);
        await actAsUser(admin, USER_OWNER_B);
        const b = await admin.query(`SELECT name FROM storage.objects WHERE bucket_id = 'logos'`);
        expect(b.rows.map((r) => r.name)).toEqual([fileB]);
      });
    });

    it('advisor y mechanic no listan logos (la lectura pública va por URL, no por RLS)', async (ctx) => {
      if (!storageAvailable) return ctx.skip();
      await withRollback(admin, async () => {
        await seedObjects();
        for (const user of [USER_ADVISOR_A, USER_MECHANIC_A]) {
          await actAsAdmin(admin);
          await actAsUser(admin, user);
          const { rows } = await admin.query(
            `SELECT 1 FROM storage.objects WHERE bucket_id = 'logos'`,
          );
          expect(rows).toEqual([]);
        }
      });
    });

    it('nadie modifica un logo: se sube uno nuevo', async (ctx) => {
      if (!storageAvailable) return ctx.skip();
      await withRollback(admin, async () => {
        await seedObjects();
        await actAsUser(admin, USER_OWNER_A);
        const res = await admin.query(`UPDATE storage.objects SET name = $1 WHERE name = $2`, [
          `${WORKSHOP_A}/otro.png`,
          fileA,
        ]);
        expect(res.rowCount).toBe(0);
      });
    });

    it('el bucket photos sigue privado y sus policies no se ven afectadas', async (ctx) => {
      if (!storageAvailable) return ctx.skip();
      const { rows } = await admin.query(`SELECT public FROM storage.buckets WHERE id = 'photos'`);
      expect(rows[0].public).toBe(false);
    });
  });

  describe('API de Storage con sesión real (requiere storage-api en marcha)', () => {
    const API = environment.supabaseUrl;
    const KEY = environment.supabaseAnonKey;
    const tokens: Record<string, string> = {};
    // El esquema `storage` existe aunque no corra el contenedor storage-api (stack mínimo de la
    // CI): las pruebas por SQL aplican siempre, estas necesitan además la API HTTP.
    let apiAvailable = false;
    const uploaded: string[] = [];

    // PNG válido de 1×1 píxel.
    const PNG = Uint8Array.from(
      atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      ),
      (c) => c.charCodeAt(0),
    );

    const signIn = async (email: string) => {
      const res = await fetch(`${API}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      return ((await res.json()) as { access_token: string }).access_token;
    };

    const upload = (token: string, path: string, body: BodyInit, type = 'image/png') =>
      fetch(`${API}/storage/v1/object/logos/${path}`, {
        method: 'POST',
        headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': type },
        body,
      });

    const remove = (token: string, path: string) =>
      fetch(`${API}/storage/v1/object/logos/${path}`, {
        method: 'DELETE',
        headers: { apikey: KEY, Authorization: `Bearer ${token}` },
      });

    const publicGet = (path: string) => fetch(`${API}/storage/v1/object/public/logos/${path}`);

    const fresh = (workshopId: string, ext = 'png') =>
      `${workshopId}/${crypto.randomUUID()}.${ext}`;

    beforeAll(async () => {
      if (!storageAvailable) return;
      try {
        // Con la API caída, el gateway responde 5xx ("name resolution failed").
        const probe = await fetch(`${API}/storage/v1/object/public/logos/${crypto.randomUUID()}`);
        apiAvailable = probe.status < 500;
        if (!apiAvailable) return;
        tokens['ownerA'] = await signIn('owner@workshop-a.com');
        tokens['mechanicA'] = await signIn('mechanic@workshop-a.com');
        tokens['ownerB'] = await signIn('owner@workshop-b.com');
      } catch {
        apiAvailable = false;
      }
    });

    afterAll(async () => {
      if (!apiAvailable) return;
      await Promise.all(uploaded.map((path) => remove(tokens['ownerA'], path).catch(() => null)));
      await Promise.all(uploaded.map((path) => remove(tokens['ownerB'], path).catch(() => null)));
    });

    it('el owner sube un logo y cualquiera lo ve por su URL pública, sin sesión', async (ctx) => {
      if (!apiAvailable) return ctx.skip();
      const path = fresh(WORKSHOP_A);
      const res = await upload(tokens['ownerA'], path, PNG);
      expect(res.ok).toBe(true);
      uploaded.push(path);

      const anonymous = await publicGet(path);
      expect(anonymous.status).toBe(200);
      expect(anonymous.headers.get('content-type')).toContain('image/png');
    });

    it('el mechanic no sube logos', async (ctx) => {
      if (!apiAvailable) return ctx.skip();
      const path = fresh(WORKSHOP_A);
      const res = await upload(tokens['mechanicA'], path, PNG);
      expect(res.ok).toBe(false);
      expect(await res.text()).toMatch(RLS_VIOLATION);
      expect((await publicGet(path)).status).not.toBe(200);
    });

    it('un owner no sube a la carpeta de otro taller', async (ctx) => {
      if (!apiAvailable) return ctx.skip();
      const path = fresh(WORKSHOP_B);
      const res = await upload(tokens['ownerA'], path, PNG);
      expect(res.ok).toBe(false);
      expect(await res.text()).toMatch(RLS_VIOLATION);
    });

    it('rechaza SVG y archivos de más de 1 MB', async (ctx) => {
      if (!apiAvailable) return ctx.skip();
      const svg = await upload(
        tokens['ownerA'],
        fresh(WORKSHOP_A, 'svg'),
        '<svg xmlns="http://www.w3.org/2000/svg"/>',
        'image/svg+xml',
      );
      expect(svg.ok).toBe(false);

      const big = await upload(tokens['ownerA'], fresh(WORKSHOP_A), new Uint8Array(1048577));
      expect(big.ok).toBe(false);
    });

    it('el owner elimina su logo; mechanic y otro owner no pueden', async (ctx) => {
      if (!apiAvailable) return ctx.skip();
      const path = fresh(WORKSHOP_A);
      expect((await upload(tokens['ownerA'], path, PNG)).ok).toBe(true);
      uploaded.push(path);

      await remove(tokens['mechanicA'], path);
      await remove(tokens['ownerB'], path);
      expect((await publicGet(path)).status).toBe(200);

      expect((await remove(tokens['ownerA'], path)).ok).toBe(true);
      expect((await publicGet(path)).status).not.toBe(200);
    });
  });
});
