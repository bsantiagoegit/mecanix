# ADR-009: Storage privado con URLs firmadas

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-10
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

Las fotos del sistema contienen información sensible:

- Estado del vehículo del cliente.
- Posibles daños preexistentes.
- Ubicación del taller.
- Datos del cliente visibles en la foto.

Dos opciones para el bucket de Supabase Storage:

1. **Bucket público**: URLs directas sin expiración.
2. **Bucket privado**: URLs firmadas con expiración.

---

## Decisión

**Bucket privado** con **URLs firmadas** con expiración de 1 hora. El cliente solicita la URL firmada vía `supabase.storage.from('photos').createSignedUrl(path, 3600)`.

Las URLs firmadas se **cachean en memoria** en el cliente por sesión para evitar regenerarlas innecesariamente.

---

## Alternativas consideradas

### Alternativa A: Bucket público

- **Descripción**: las fotos se sirven vía URLs directas, sin expiración.
- **Ventajas**: URLs predecibles, sin firma. Más simple.
- **Desventajas**: cualquiera con la URL puede ver la foto. Las URLs son compartibles indefinidamente. No hay control de acceso.
- **Razón de descarte**: los datos son privados. No podemos exponerlos.

### Alternativa B: Bucket privado con URLs firmadas largas

- **Descripción**: URLs firmadas con expiración de 7 días.
- **Ventajas**: menos regeneración de URLs.
- **Desventajas**: si una URL se filtra, es válida por 7 días.
- **Razón de descarte**: 1 hora es suficiente para una sesión de trabajo. La regeneración es trivial.

### Alternativa C: Servir fotos vía API del backend

- **Descripción**: el backend sirve las fotos después de validar permisos.
- **Ventajas**: control total.
- **Desventajas**: el backend se convierte en proxy. Más carga. Sin CDN.
- **Razón de descarte**: las URLs firmadas de Supabase son más eficientes (CDN).

---

## Consecuencias

### Positivas

- Los datos están protegidos. Solo los miembros del taller pueden ver las fotos.
- Las URLs expiran. Si se filtran, son inútiles después de 1 hora.
- CDN de Supabase sirve las URLs firmadas eficientemente.

### Negativas

- El cliente debe solicitar URL firmada antes de mostrar cada foto.
- Sin caché, cada foto implica una llamada a Supabase.
- La URL firmada cambia en cada llamada (no se puede usar como key de caché del navegador).

### Neutras

- Si en el futuro se necesita compartir una foto con el cliente, se firma con expiración más larga.
- El bucket privado es la opción estándar en Supabase para contenido sensible.

---

## Referencias

- [Estrategia de storage](../storage/README.md)
- [Policies de Storage](../storage/policies.md)
- [Supabase Storage docs](https://supabase.com/docs/guides/storage)

---

_ADR-009 — Storage privado con URLs firmadas_
