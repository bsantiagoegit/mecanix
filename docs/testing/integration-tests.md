# Integration Tests

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir cómo se testean RLS, triggers y RPCs con Supabase local.

---

## Setup

### Supabase local

```bash
supabase start
supabase db reset   # aplica migraciones + seed
```

**Nota**: `supabase db reset` limpia la DB y aplica migraciones + seed. Se corre antes de cada suite de integration tests.

### Conexión

```typescript
// src/testing/utils/db.ts
import { Client } from 'pg';

export async function connectAsAdmin(): Promise<Client> {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres',
  });
  await client.connect();
  return client;
}

export async function connectAs(email: string): Promise<Client> {
  const client = await connectAsAdmin();
  // Obtener el user id desde auth.users
  const { rows } = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
  const userId = rows[0].id;
  // Simular JWT
  await client.query(
    `SET request.jwt.claims = '${JSON.stringify({ sub: userId, role: 'authenticated' })}'`,
  );
  await client.query(`SET ROLE authenticated`);
  return client;
}
```

---

## Tests de RLS

### Patrón

```typescript
// supabase/tests/rls/customers.spec.ts
import { Client } from 'pg';
import { connectAs, connectAsAdmin } from '../../../src/testing/utils/db';

describe('RLS: customers', () => {
  let advisorA: Client;
  let advisorB: Client;
  let mechanicA: Client;
  let admin: Client;

  beforeAll(async () => {
    admin = await connectAsAdmin();
    advisorA = await connectAs('advisor@workshop-a.com');
    advisorB = await connectAs('advisor@workshop-b.com');
    mechanicA = await connectAs('mechanic@workshop-a.com');
  });

  afterAll(async () => {
    await Promise.all([admin.end(), advisorA.end(), advisorB.end(), mechanicA.end()]);
  });

  describe('SELECT', () => {
    it('un advisor ve solo clientes de su taller', async () => {
      const { rows } = await advisorA.query('SELECT * FROM customers');
      expect(rows.every((r) => r.workshop_id === WORKSHOP_A)).toBe(true);
    });

    it('un advisor no ve clientes de otro taller', async () => {
      const { rows } = await advisorB.query('SELECT * FROM customers');
      expect(rows.every((r) => r.workshop_id === WORKSHOP_B)).toBe(true);
    });

    it('un mechanic ve la vista customers_public sin phone', async () => {
      const { rows } = await mechanicA.query('SELECT * FROM customers_public');
      expect(rows[0]).not.toHaveProperty('phone');
    });
  });

  describe('INSERT', () => {
    it('un advisor puede crear cliente en su taller', async () => {
      await expect(
        advisorA.query(
          `INSERT INTO customers (workshop_id, first_name, last_name, phone) VALUES ($1, 'Nuevo', 'Cliente', '123')`,
          [WORKSHOP_A],
        ),
      ).resolves.toBeDefined();
    });

    it('un advisor no puede crear cliente en otro taller', async () => {
      await expect(
        advisorA.query(
          `INSERT INTO customers (workshop_id, first_name, last_name, phone) VALUES ($1, 'X', 'Y', '123')`,
          [WORKSHOP_B],
        ),
      ).rejects.toThrow(/policy/i);
    });
  });

  describe('UPDATE', () => {
    it('un mechanic no puede editar clientes', async () => {
      await expect(
        mechanicA.query(`UPDATE customers SET first_name = 'X' WHERE id = $1`, [CUSTOMER_A]),
      ).resolves.toMatchObject({ rowCount: 0 });
    });
  });
});
```

### Qué testear

Para cada tabla con RLS:

- **SELECT**: un usuario ve sus datos y no ve los de otros talleres.
- **INSERT**: un usuario puede insertar en su taller, no en otros.
- **UPDATE**: solo los roles autorizados pueden actualizar.
- **DELETE**: solo los roles autorizados pueden eliminar (o nadie).

**Regla**: cada policy tiene al menos un test positivo y uno negativo.

---

## Tests de triggers

### Patrón

```typescript
// supabase/tests/triggers/work-order-sequence.spec.ts
import { Client } from 'pg';
import { connectAsAdmin } from '../../../src/testing/utils/db';

describe('Trigger: assign_work_order_sequence', () => {
  let admin: Client;

  beforeEach(async () => {
    admin = await connectAsAdmin();
    await admin.query('TRUNCATE work_orders CASCADE');
  });

  afterEach(async () => {
    await admin.end();
  });

  it('asigna OT-2026-0001 a la primera orden confirmada', async () => {
    const orderId = await createDraftOrder(admin, WORKSHOP_A);
    await admin.query(`UPDATE work_orders SET status = 'received' WHERE id = $1`, [orderId]);

    const { rows } = await admin.query('SELECT sequence_number FROM work_orders WHERE id = $1', [
      orderId,
    ]);
    expect(rows[0].sequence_number).toBe('OT-2026-0001');
  });

  it('asigna secuencia por taller', async () => {
    const order1A = await createAndConfirmOrder(admin, WORKSHOP_A);
    const order1B = await createAndConfirmOrder(admin, WORKSHOP_B);

    expect(order1A.sequence_number).toBe('OT-2026-0001');
    expect(order1B.sequence_number).toBe('OT-2026-0001'); // secuencia independiente
  });

  it('reinicia la secuencia en un año nuevo', async () => {
    // mock now() para simular cambio de año
  });
});
```

### Qué testear

Para cada trigger:

- **Happy path**: la función hace lo esperado.
- **Edge cases**: casos límite (primera vez, cambio de año, etc.).
- **Idempotencia**: si aplica, ejecutarlo dos veces no causa problemas.
- **Rollback**: si falla, no deja datos inconsistentes.

---

## Tests de RPCs

### Patrón

```typescript
// supabase/tests/rpcs/transition_work_order.spec.ts
describe('RPC: transition_work_order', () => {
  let admin: Client;
  let advisor: Client;
  let mechanic: Client;

  beforeEach(async () => {
    admin = await connectAsAdmin();
    advisor = await connectAs('advisor@workshop-a.com');
    mechanic = await connectAs('mechanic@workshop-a.com');
    await admin.query('TRUNCATE work_orders CASCADE');
  });

  it('draft → received solo si intake completo', async () => {
    const orderId = await createDraftOrder(admin, WORKSHOP_A);
    // sin intake
    await expect(
      advisor.query(`SELECT transition_work_order($1, 'received', 'ok')`, [orderId]),
    ).rejects.toThrow(/intake/i);
  });

  it('draft → received con intake completo funciona', async () => {
    const orderId = await createDraftOrderWithIntake(admin, WORKSHOP_A);
    await advisor.query(`SELECT transition_work_order($1, 'received', 'ok')`, [orderId]);

    const { rows } = await admin.query('SELECT status FROM work_orders WHERE id = $1', [orderId]);
    expect(rows[0].status).toBe('received');
  });

  it('solo owner/advisor pueden cancelar', async () => {
    const orderId = await createConfirmedOrder(admin, WORKSHOP_A);
    await expect(
      mechanic.query(`SELECT transition_work_order($1, 'cancelled', 'motivo largo')`, [orderId]),
    ).rejects.toThrow(/permission/i);
  });

  it('cancelación requiere motivo de 10+ caracteres', async () => {
    const orderId = await createConfirmedOrder(admin, WORKSHOP_A);
    await expect(
      advisor.query(`SELECT transition_work_order($1, 'cancelled', 'corto')`, [orderId]),
    ).rejects.toThrow(/motivo/i);
  });
});
```

### Qué testear

Para cada RPC:

- **Happy path**: la función hace lo esperado.
- **Precondiciones**: si no se cumplen, la función falla.
- **Permisos**: solo los roles autorizados pueden ejecutarla.
- **Reglas de negocio**: las reglas (RT-NN) se validan.
- **Transaccionalidad**: si algo falla, no hay cambios parciales.

---

## Comandos

```bash
# Reset DB antes de tests
supabase db reset

# Correr integration tests
pnpm test:integration

# Correr solo un archivo
pnpm test:integration -- supabase/tests/rls/customers.spec.ts
```

**Script npm**:

```json
{
  "scripts": {
    "test:integration": "vitest run supabase/tests"
  }
}
```

---

## Referencias

- [README de testing](./README.md)
- [Decisiones transversales](./decisions.md)
- [Estrategia de Seguridad](../architecture/security/README.md)
- [Modelo Relacional](../architecture/data-model/README.md)
- [Reglas de Negocio](../domain/business-rules.md)

---

_Integration Tests v1.0_
