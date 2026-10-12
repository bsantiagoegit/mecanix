# Estrategia de Testing

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Definir qué se testea, con qué cobertura y con qué prioridades.

---

## Pirámide de tests

```
       ╱╲
      ╱  ╲          E2E (~10 tests)
     ╱────╲         Playwright
    ╱      ╲
   ╱────────╲       Integration (~50 tests)
  ╱          ╲      Vitest + Supabase local
 ╱────────────╲
╱______________╲    Unit (~200 tests)
                    Vitest
```

**Distribución esperada**:

- **Unit**: ~200 tests (70%).
- **Integration**: ~50 tests (25%).
- **E2E**: ~10 tests (5%).

**Razón**: la pirámide clásica. Más unit (rápidos), menos E2E (lentos).

---

## Qué se testea por capa

| Capa             | Unit | Integration                | E2E | Cobertura |
| ---------------- | ---- | -------------------------- | --- | --------- |
| Data services    | ✅   | ⚠️ (contra Supabase local) | ❌  | 80%       |
| Componentes dumb | ✅   | ❌                         | ⚠️  | 60%       |
| Contenedores     | ✅   | ❌                         | ⚠️  | 50%       |
| Guards           | ✅   | ❌                         | ❌  | 80%       |
| Interceptors     | ✅   | ❌                         | ❌  | 80%       |
| Stores NgRx      | ✅   | ❌                         | ❌  | 70%       |
| RPCs             | ❌   | ✅                         | ❌  | 90%       |
| Triggers         | ❌   | ✅                         | ❌  | 90%       |
| Policies RLS     | ❌   | ✅                         | ❌  | 100%      |
| Rutas            | ⚠️   | ❌                         | ⚠️  | 30%       |

**Leyenda**: ✅ principal | ⚠️ parcial | ❌ no aplica

---

## Prioridades

### Prioridad 1 (crítico)

- **RLS**: todas las policies se testean. Si una falla, hay brecha de seguridad.
- **RPCs de transición de estado**: `transition_work_order()`, `confirm_work_order_reception()`, `close_work_order()`.
- **Triggers de negocio**: `assign_work_order_sequence`, `create_warranty_on_completion`, `log_work_order_status_change`.

### Prioridad 2 (importante)

- **Data services** de features críticos (`work-orders`, `customers`, `vehicles`).
- **Reglas de negocio** transversales (RT-01 a RT-15).
- **Guards** de autenticación y rol.

### Prioridad 3 (deseable)

- **Componentes dumb** con lógica no trivial.
- **Contenedores** con flujos complejos.
- **Stores NgRx** con efectos asíncronos.

### Prioridad 4 (no en MVP)

- Tests de performance.
- Visual regression.
- Mutation testing.
- Contract testing.

---

## Cobertura: cómo medirla

**Herramienta**: `vitest --coverage` con `@vitest/coverage-v8`.

**Configuración**:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        '**/*.spec.ts',
        '**/*.mock.ts',
        '**/testing/**',
        '**/*.model.ts',
        '**/environments/**',
        '**/main.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
```

**Regla**: los thresholds son globales. Si una capa específica necesita más, se valida en code review, no en configuración.

---

## Cuándo NO escribir un test

- **Modelos/interfaces**: son declarativos.
- **Configuración de app**: no tiene lógica.
- **CSS/Tailwind**: no se testea.
- **Rutas simples**: sin guards ni resolvers.
- **Código generado**: migraciones, tipos generados por Supabase.
- **Componentes sin lógica**: si un componente solo renderiza inputs, el E2E lo cubre.

**Razón**: el testing es una inversión. Si no aporta valor, no se escribe.

---

## Cómo se prioriza en la práctica

Al implementar un feature:

1. **Escribir unit tests de data services** (crítico).
2. **Escribir integration tests de RLS/triggers** si el feature toca BD (crítico).
3. **Escribir unit tests de componentes dumb** con lógica (importante).
4. **Escribir E2E** solo si el feature tiene un flujo end-to-end crítico.

**Tiempo estimado**: ~30% del tiempo de desarrollo del feature.

---

## Referencias

- [README de testing](./README.md)
- [Decisiones transversales](./decisions.md)
- [Herramientas](./tools.md)

---

_Estrategia de Testing v1.1_
