# Casos de Uso Priorizados

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.2
- **Fecha:** Octubre 2026
- **Total:** 74 MVP + 28 Fase 2 + 4 Fase 3 = 106 casos de uso
- **Próxima revisión:** Al cierre del modelo conceptual

> Este archivo es el índice. Cada feature tiene su propio archivo en [`use-cases/`](use-cases/) con la tabla de casos de uso y, cuando aplica, el detalle de flujo/reglas de negocio.

## Features

| # | Feature | Archivo |
| - | ------- | ------- |
| 1  | Autenticación y Sesión     | [use-cases/01-auth.md](use-cases/01-auth.md) |
| 2  | Onboarding de Taller       | [use-cases/02-onboarding-taller.md](use-cases/02-onboarding-taller.md) |
| 3  | Clientes                   | [use-cases/03-clientes.md](use-cases/03-clientes.md) |
| 4  | Vehículos                  | [use-cases/04-vehiculos.md](use-cases/04-vehiculos.md) |
| 5  | Órdenes de Trabajo         | [use-cases/05-ordenes-trabajo.md](use-cases/05-ordenes-trabajo.md) |
| 6  | Inspecciones y Hallazgos   | [use-cases/06-inspecciones-hallazgos.md](use-cases/06-inspecciones-hallazgos.md) |
| 7  | Diagnósticos               | [use-cases/07-diagnosticos.md](use-cases/07-diagnosticos.md) |
| 8  | Reparaciones               | [use-cases/08-reparaciones.md](use-cases/08-reparaciones.md) |
| 9  | Repuestos e Insumos        | [use-cases/09-repuestos-insumos.md](use-cases/09-repuestos-insumos.md) |
| 10 | Cotizaciones               | [use-cases/10-cotizaciones.md](use-cases/10-cotizaciones.md) |
| 11 | Garantías                  | [use-cases/11-garantias.md](use-cases/11-garantias.md) |
| 12 | Fotos y Evidencia          | [use-cases/12-fotos-evidencia.md](use-cases/12-fotos-evidencia.md) |
| 13 | Documentos PDF             | [use-cases/13-documentos-pdf.md](use-cases/13-documentos-pdf.md) |
| 14 | Reportes                   | [use-cases/14-reportes.md](use-cases/14-reportes.md) |
| 15 | Administración del SaaS    | [use-cases/15-administracion-saas.md](use-cases/15-administracion-saas.md) |

> **Nota (v1.1):** los casos de uso de Feature 14 (Reportes) se renombraron de `UC-REP-xx` a `UC-RPT-xx` porque colisionaban con los IDs de Feature 8 (Reparaciones), que ya usaba el prefijo `UC-REP`. Ver detalle en [use-cases/14-reportes.md](use-cases/14-reportes.md).
>
> **Nota (v1.2):** el total y el resumen de prioridades estaban mal calculados (decían 58+27+5=90). El conteo real de las 15 tablas es 74 MVP + 28 Fase 2 + 4 Fase 3 = 106. Corregido abajo.

## Resumen de prioridades

| Prioridad  | Cantidad | Descripción                                             |
| ---------- | -------- | ------------------------------------------------------- |
| **MVP**    | 74       | Sin esto, el sistema no reemplaza el papel              |
| **Fase 2** | 28       | Mejora significativa, pero el sistema funciona sin esto |
| **Fase 3** | 4        | Nice-to-have, solo si el negocio lo pide                |

## Matriz de priorización

```
MVP (74 casos de uso)
├── Auth (3)
├── Onboarding taller (5)
├── Clientes (5)
├── Vehículos (5)
├── Órdenes (10)
├── Inspecciones (6)
├── Diagnósticos (3)
├── Reparaciones (10)
├── Repuestos/Insumos (5)
├── Cotizaciones (5)
├── Garantías (2)
├── Fotos (5)
├── PDFs (5)
├── Reportes (3)
└── SaaS admin (2)

Fase 2 (28 casos de uso)
├── Auth (2)
├── Onboarding taller (2)
├── Clientes (1)
├── Vehículos (2)
├── Órdenes (4)
├── Diagnósticos (1)
├── Reparaciones (1)
├── Repuestos/Insumos (1)
├── Cotizaciones (2)
├── Garantías (2)
├── Fotos (1)
├── PDFs (1)
├── Reportes (4)
└── SaaS admin (4)

Fase 3 (4 casos de uso)
├── Auth (1)
├── Onboarding taller (1)
├── Clientes (1)
├── Reportes (0)
└── SaaS admin (1)
```

_Casos de Uso Priorizados v1.2_
_Documento vivo. Próxima revisión al cierre del modelo conceptual._
