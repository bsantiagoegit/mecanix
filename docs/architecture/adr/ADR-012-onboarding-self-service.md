# ADR-012: Onboarding self-service de taller con un taller por cuenta

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-11
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** — (modifica el plan de UC-WS-01 y UC-WS-08; ajusta D-RLS-09)
- **Superseded por:** —

---

## Contexto

Los casos de uso originales preveían que el administrador del SaaS creara cada taller a mano (UC-WS-01, UC-SAAS-02) y que el onboarding autónomo (UC-WS-08) llegara en Fase 3. D-RLS-09 refuerza esto: ningún usuario autenticado puede crear talleres; solo `service_role`.

Al implementar el registro (UC-AUTH-07) apareció el problema: una persona crea su cuenta, confirma su correo y no puede entrar, porque no pertenece a ningún taller y nadie se lo creó. Para que el MVP sea usable sin intervención manual hay dos caminos:

1. Construir primero el panel `saas-admin` (una app separada) y crear cada taller a mano.
2. Permitir que quien se registra cree su propio taller y quede como `owner`.

---

## Decisión

**UC-WS-08 (onboarding self-service) pasa a MVP.** Un usuario registrado y con el correo confirmado, que aún no pertenece a ningún taller, puede crear su taller. Quien lo crea queda como `owner` de ese taller.

Reglas:

- **Un taller por cuenta.** En el MVP un usuario pertenece como máximo a un taller (a lo sumo una membresía no inactiva).
- **Un solo `owner` por taller**, que es quien lo crea. El `owner` no se invita (ver [ADR-013](./ADR-013-invitaciones-edge-function.md)).
- **La creación pasa por una función de base de datos** `create_workshop(...)` con `SECURITY DEFINER`: crea el `workshop` y la membresía `owner` activa en una sola transacción, usando `auth.uid()`. Sigue sin existir una policy de `INSERT` en `workshops` para usuarios.
- UC-WS-01 y UC-SAAS-02 (creación manual por el admin del SaaS) pasan a **Fase 2**, como alternativa para casos especiales.

---

## Alternativas consideradas

### Alternativa A: Mantener la creación manual (Fase 3 para el self-service)

- **Descripción**: el admin del SaaS crea cada taller con `service_role`, desde el panel `saas-admin`.
- **Ventajas**: control total de quién entra; sin riesgo de abuso.
- **Desventajas**: exige construir el panel de administración antes de poder usar el MVP; cada cliente nuevo depende de una acción manual.
- **Razón de descarte**: más trabajo y un cuello de botella. El panel sigue siendo útil, pero ya no es un requisito para arrancar.

### Alternativa B: `INSERT` directo en `workshops` con una policy

- **Descripción**: permitir a `authenticated` insertar un taller y luego insertarse como `owner`.
- **Ventajas**: sin función de base de datos.
- **Desventajas**: son dos operaciones no atómicas; la policy de `workshop_members` tendría que permitir que cualquiera se haga `owner` de cualquier taller que acabe de crear; difícil imponer "un taller por cuenta".
- **Razón de descarte**: abre una superficie de ataque. La función `SECURITY DEFINER` concentra las reglas en un solo punto.

### Alternativa C: Varios talleres por cuenta

- **Descripción**: un usuario puede ser `owner` de un taller y `mechanic` de otro (lo que decía el glosario).
- **Ventajas**: flexible.
- **Desventajas**: exige un selector de taller en el login y en toda la app, y facilita el abuso (crear talleres sin límite). Sin planes ni límites (UC-SAAS-07 es Fase 3) no hay con qué acotarlo.
- **Razón de descarte**: complejidad y riesgo sin necesidad en el MVP. El modelo de datos lo permitiría después; basta con relajar la restricción.

---

## Consecuencias

### Positivas

- El producto es usable sin intervención manual: registro, confirmación de correo, "Crea tu taller".
- No hace falta construir `saas-admin` para el arranque.
- Las reglas (un taller por cuenta, `owner` único) viven en la base de datos, no solo en la interfaz.

### Negativas

- Cualquiera con un correo confirmado puede crear un taller. Sin límites por plan, el control se limita a un taller por cuenta y a la confirmación de correo.
- La sesión deja de ser "usuario con taller o error": hay un estado "autenticado sin taller" que el login y el guard deben manejar (ver [onboarding de taller](../multi-tenant/workshop-onboarding.md)).
- Hay que ajustar documentos: matriz de permisos, glosario (un taller por cuenta), D-RLS-09 y los índices de casos de uso.

### Neutras

- El modelo de datos se mantiene; se añaden dos índices únicos parciales y la función `create_workshop` (ver [tablas de tenancy](../data-model/tables/01-tenancy.md)).
