# Configuración por Taller

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir cómo se modela la configuración específica de cada taller.

---

## Diferencia con feature flags

| Aspecto           | Configuración por taller          | Feature flag                     |
| ----------------- | --------------------------------- | -------------------------------- |
| Propósito         | Ajustar comportamiento por tenant | Activar código nuevo en runtime  |
| Temporalidad      | Largo plazo                       | Corto plazo                      |
| Quién lo controla | Owner del taller o SaaS admin     | Equipo de desarrollo             |
| Dónde vive        | Columna en `workshops`            | Servicio externo                 |
| Ejemplo           | `quote_expiration_days = 15`      | "Activar el nuevo editor al 10%" |

---

## Configuraciones actuales

En la tabla `workshops`:

```sql
CREATE TABLE workshops (
  id                    uuid PRIMARY KEY,
  name                  text NOT NULL,
  address               text NOT NULL,
  phone                 text NOT NULL,
  logo_url              text,
  capacity              int NOT NULL DEFAULT 4,
  min_intake_photos     int NOT NULL DEFAULT 4,
  quote_expiration_days int NOT NULL DEFAULT 7,
  warranty_days         int NOT NULL DEFAULT 14,
  currency              char(3) NOT NULL DEFAULT 'USD',
  timezone              text NOT NULL DEFAULT 'America/Guayaquil',
  -- Fase 2: más columnas
);
```

**Cada taller tiene sus propios valores**. No hay código custom.

---

## Cómo agregar una configuración nueva

### 1. Identificar la necesidad

Un taller pide algo que se comporta distinto.

**Ejemplo**: "Queremos 15 días de expiración de cotización en vez de 7".

### 2. Verificar si es configurable o funcionalidad

- **Configuración**: ajuste de un valor. Va en `workshops`.
- **Funcionalidad**: nueva pantalla o flujo. Va en `workshop_features` (Fase 2).

### 3. Agregar la columna

```sql
ALTER TABLE workshops
  ADD COLUMN max_photos_per_order int NOT NULL DEFAULT 20;

ALTER TABLE workshops
  ADD CONSTRAINT workshops_max_photos_positive CHECK (max_photos_per_order > 0);
```

### 4. Actualizar el modelo relacional

En `docs/architecture/data-model/tables/01-tenancy.md`.

### 5. Actualizar el frontend

En `WorkshopStore`:

```typescript
readonly maxPhotosPerOrder = computed(() => this.active()?.maxPhotosPerOrder ?? 20);
```

### 6. Usar en el componente

```html
@if (photos().length >= workshop.maxPhotosPerOrder()) {
<p class="text-danger-600">Máximo alcanzado</p>
}
```

### 7. Actualizar la documentación

- Glosario si aplica.
- Casos de uso si aplica.
- Reglas de negocio si aplica.

---

## Configuraciones planeadas para Fase 2

**No agregar preventivamente**. Solo cuando un taller lo pida.

| Configuración                   | Cuándo                                              |
| ------------------------------- | --------------------------------------------------- |
| `max_photos_per_order`          | Cuando un taller suba muchas fotos                  |
| `enable_electronic_invoice`     | Cuando un taller necesite facturación electrónica   |
| `enable_multi_currency`         | Cuando un taller cobre en otra moneda               |
| `default_labor_rate`            | Cuando un taller cobre mano de obra por hora        |
| `enable_whatsapp_notifications` | Cuando un taller quiera notificaciones por WhatsApp |

---

## Cuándo migrar a JSONB

Cuando haya **~20+ configuraciones** en `workshops`.

```sql
ALTER TABLE workshops
  ADD COLUMN settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE workshops
  ADD CONSTRAINT workshops_settings_valid CHECK (
    jsonb_typeof(settings) = 'object'
  );
```

**Razón**: a partir de 20 columnas, la tabla se vuelve difícil de manejar. JSONB es más flexible.

**Validación**: cada clave se valida con CHECK constraints o con un schema JSON.

**Acceso desde el frontend**:

```typescript
readonly maxPhotos = computed(() => this.active()?.settings?.['maxPhotosPerOrder'] ?? 20);
```

**Trade-off**: menos tipado, más flexible.

---

## Reglas

1. **No agregar columnas preventivamente**. Solo cuando un taller lo pida.
2. **Cada columna tiene default, tipo y CHECK**.
3. **Documentar en `data-model/`**.
4. **Exponer en `WorkshopStore`** del frontend.
5. **Validar en backend** (RLS o RPC).

---

## Referencias

- [README de multi-tenant](./README.md)
- [Decisiones transversales](./decisions.md)
- [Modelo relacional](../data-model/README.md)

---

_Configuración por Taller v1.0_
