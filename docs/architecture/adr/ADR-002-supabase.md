# ADR-002: Supabase como backend-as-a-service

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-10
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

Necesitamos un backend para una app SaaS multi-tenant con las siguientes características:

- PostgreSQL como base de datos relacional.
- Autenticación con email/password.
- Storage para fotos.
- Multi-tenant con aislamiento a nivel de fila (RLS).
- API REST para el frontend (Angular).
- Bajo costo operativo.
- 1 desarrollador sin experiencia en DevOps.
- Free tier suficiente para el MVP.

---

## Decisión

Usar **Supabase** como backend-as-a-service. Componentes:

- **PostgreSQL** gestionado (con extensiones `pgcrypto`, `pg_cron` en Pro).
- **Supabase Auth** para autenticación.
- **Supabase Storage** para fotos.
- **Row Level Security** para aislamiento multi-tenant.
- **RPCs** para operaciones transaccionales.
- **Triggers** para auditoría y automatizaciones.
- **PostgREST** como API REST autogenerada.
- **Realtime** disponible pero **no se usa en MVP**.

---

## Alternativas consideradas

### Alternativa A: Firebase

- **Descripción**: backend-as-a-service de Google, NoSQL.
- **Ventajas**: integración con Google Cloud, buena documentación.
- **Desventajas**: Firestore (NoSQL) complica consultas relacionales. Las reglas de seguridad son menos expresivas que RLS. Los costos escalan mal con muchas lecturas.
- **Razón de descarte**: el dominio es relacional (clientes, vehículos, órdenes, reparaciones). NoSQL complica las queries y la integridad.

### Alternativa B: NestJS + PostgreSQL propio

- **Descripción**: backend Node.js con PostgreSQL en Railway o Render.
- **Ventajas**: control total, sin dependencia de un BaaS.
- **Desventajas**: mucho más código, más DevOps, más superficie de error. El desarrollador no tiene experiencia en backend.
- **Razón de descarte**: el proyecto no justifica el esfuerzo. Supabase cubre el 90% de las necesidades.

### Alternativa C: Appwrite

- **Descripción**: alternativa open-source a Supabase.
- **Ventajas**: self-hostable, sin vendor lock-in.
- **Desventajas**: menos maduro, menos documentación, ecosistema más pequeño.
- **Razón de descarte**: Supabase es más maduro y tiene mejor DX.

### Alternativa D: PocketBase

- **Descripción**: backend en un solo binario Go con SQLite.
- **Ventajas**: extremadamente simple, un solo archivo.
- **Desventajas**: SQLite no escala bien para multi-tenant con muchas escrituras concurrentes. RLS no existe.
- **Razón de descarte**: SQLite no es adecuado para SaaS multi-tenant.

---

## Consecuencias

### Positivas

- Sin código de backend que mantener.
- RLS protege los datos en el origen.
- Auth, Storage y PostgreSQL en un solo servicio.
- Free tier suficiente para el MVP.
- Migraciones versionadas con Supabase CLI.
- PostgREST genera la API automáticamente.

### Negativas

- Dependencia de Supabase (vendor lock-in moderado).
- RLS se vuelve complejo con multi-tenant + roles.
- Free tier se pausa si no hay actividad por 1 semana.
- Realtime y pg_cron requieren Pro.

### Neutras

- El proyecto está atado al roadmap de Supabase.
- Migrar a PostgreSQL self-hosted es posible pero requiere trabajo.

---

## Referencias

- [Supabase docs](https://supabase.com/docs)
- [Estrategia de seguridad](../security/README.md)
- [Modelo relacional](../data-model/README.md)

---

_ADR-002 — Supabase como backend-as-a-service_
