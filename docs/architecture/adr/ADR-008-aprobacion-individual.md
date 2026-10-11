# ADR-008: Aprobación por reparación individual

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-10
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

Cuando el mecánico cotiza reparaciones, el cliente puede:

1. **Aprobar todo**: acepta el trabajo completo.
2. **Rechazar todo**: no acepta nada.
3. **Aprobar parcialmente**: acepta algunas reparaciones y rechaza otras.

El caso 3 es **común en la realidad**. Ejemplo real: el cliente recibe una cotización con dos opciones (reparar o reemplazar una pieza). Elige la opción más segura aunque sea más costosa. O el cliente decide posponer una reparación no urgente.

Dos opciones de modelado:

1. **Aprobación por cotización**: una cotización se aprueba o rechaza como un todo.
2. **Aprobación por reparación individual**: cada reparación se aprueba o rechaza.

---

## Decisión

Modelar la aprobación como una entidad (`approvals`) vinculada a **cada reparación individual** (`recommended_repairs`). Una cotización puede tener múltiples aprobaciones, una por reparación.

El estado de la cotización se **deriva** del estado de sus reparaciones:

- Todas aprobadas → `approved`.
- Algunas aprobadas → `partially_approved`.
- Ninguna aprobada → `rejected`.

---

## Alternativas consideradas

### Alternativa A: Aprobación por cotización completa

- **Descripción**: una cotización tiene un solo estado (`approved`, `rejected`).
- **Ventajas**: modelo más simple.
- **Desventajas**: no refleja la realidad. El cliente que aprueba 3 de 5 reparaciones no puede expresarse.
- **Razón de descarte**: no refleja el caso real.

### Alternativa B: Aprobación por cotización con lista de reparaciones aprobadas

- **Descripción**: la cotización tiene un array de IDs de reparaciones aprobadas.
- **Ventajas**: modelo más simple que la entidad `approvals`.
- **Desventajas**: no hay trazabilidad (quién aprobó, cuándo, por qué canal). No se puede auditar.
- **Razón de descarte**: falta trazabilidad.

### Alternativa C: Aprobación por cotización con campo de monto aprobado

- **Descripción**: la cotización tiene un campo `approved_amount` que puede ser menor al total.
- **Ventajas**: modelo muy simple.
- **Desventajas**: no se sabe qué reparaciones específicas se aprobaron. El taller no sabe qué hacer.
- **Razón de descarte**: información insuficiente para el taller.

---

## Consecuencias

### Positivas

- Refleja la realidad del taller.
- Trazabilidad completa: quién aprobó, cuándo, por qué canal.
- Permite reportes: "tasa de aprobación por reparación", "monto aprobado vs cotizado".
- El cliente puede cambiar de opinión (se inserta un nuevo `approval`, el último gana).

### Negativas

- Una tabla más (`approvals`).
- El estado de la cotización es derivado (no se almacena directamente, se calcula).
- El frontend debe mostrar reparaciones individuales con sus estados.

### Neutras

- El canal de aprobación se registra (presencial, teléfono, WhatsApp, email).
- Si el cliente cambia de opinión, se inserta un nuevo `approval`. El último es el válido.

---

## Referencias

- [Glosario: Aprobación](../../domain/glossary.md)
- [Reglas de negocio: RT-14](../../domain/business-rules.md)
- [Modelo relacional: Repairs](../data-model/tables/05-repairs.md)

---

_ADR-008 — Aprobación por reparación individual_
