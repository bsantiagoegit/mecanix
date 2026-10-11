# Glosario del Dominio

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 2.0
- **Fecha:** Octubre 2026
- **Estado:** Estable para derivar modelo conceptual
- **Próxima revisión:** Al cierre del modelo de datos

---

## Leyenda

- 🆕 **NUEVO** — término nuevo en v2
- ✏️ **MOD** — definición refinada
- 🔗 **REL** — relación cambiada
- ⚠️ **IMPACTO** — decisión que afecta el modelo

---

## Contenido

1. [A. Personas y actores](#a-personas-y-actores)
2. [B. Vehículos](#b-vehículos)
3. [C. Órdenes y trabajos](#c-órdenes-y-trabajos)
4. [D. Documentos y comunicación](#d-documentos-y-comunicación)
5. [E. Reportes y métricas](#e-reportes-y-métricas)
6. [F. Estados y transiciones](#f-estados-y-transiciones)
7. [G. Términos que NO usamos](#g-términos-que-no-usamos)
8. [H. Decisiones derivadas](#h-decisiones-derivadas)
9. [I. Preguntas abiertas](#i-preguntas-abiertas-no-bloqueantes)

---

## A. Personas y actores

**Taller (Workshop)**
Negocio que repara vehículos. En el sistema, es la unidad de aislamiento multi-tenant. Cada taller tiene sus propios clientes, vehículos, órdenes y usuarios. Los talleres no comparten información entre sí.

- **Atributos:** nombre, dirección, teléfono, logo, capacidad máxima de vehículos simultáneos, configuración regional (moneda, zona horaria, formato de fecha), mínimo de fotos de intake (default 4), días de expiración de cotización (default 7).

**Usuario (User)**
Persona que accede al sistema con credenciales. Puede ser dueño, asesor o mecánico. Un usuario pertenece a uno o más talleres (relación muchos-a-muchos). Su identidad es global (email + password), pero su rol es específico por taller.

**Miembro de taller (Workshop Member)**
Relación entre un usuario y un taller, con un rol asignado. Un usuario puede ser `owner` en un taller y `mechanic` en otro. Esta entidad existe porque la relación no es solo "pertenece", tiene atributos: rol, fecha de ingreso, estado (activo/inactivo).

**Dueño / Administrador (Owner)**
Rol de máximo privilegio en un taller. Ve todo, gestiona usuarios, ve reportes, configura el taller.

**Asesor / Cotizador (Advisor)**
Rol que atiende al cliente, registra el problema reportado, cotiza, contacta al cliente, gestiona la aprobación de reparaciones. En este taller, es la persona que cotiza y también hace trabajos de mecánica.

**Mecánico (Mechanic)**
Rol que inspecciona, diagnostica, repara. Registra hallazgos, diagnósticos, reparaciones realizadas, tiempo de trabajo. No ve cotizaciones ni datos financieros.

**Cliente / Propietario del vehículo (Customer)**
Persona que lleva su vehículo al taller. **No es usuario del sistema en el MVP.** Sus datos se registran: nombres, apellidos, dirección, teléfono, identificación (DNI/cédula), email (opcional). Un cliente puede tener múltiples vehículos. Un vehículo puede cambiar de dueño.

**Proveedor (Supplier)**
Negocio que vende repuestos o insumos al taller. En el MVP, solo se registra como entidad simple (nombre, teléfono, contacto). No hay gestión de proveedores completa.

---

## B. Vehículos

**Vehículo (Vehicle)**
Entidad independiente del cliente. Atributos: marca, modelo, año, placa, color, VIN (opcional), tipo de transmisión, tiene clave (sí/no), observaciones. Un vehículo tiene un historial completo de órdenes, independientemente de quién sea el dueño en cada momento.

**Propiedad de vehículo (Vehicle Ownership)**
Relación temporal entre un vehículo y un cliente. Tiene fecha de inicio y fecha de fin. Permite modelar transferencias de propiedad sin perder el historial. Cuando un vehículo se vende, se cierra la ownership anterior y se crea una nueva.

**Placa (License Plate)**
Identificador público del vehículo. Puede cambiar en algunos casos (transferencias entre regiones, placas personalizadas). **No es la primary key** del vehículo; es un atributo con restricción de unicidad por taller.

**VIN (Vehicle Identification Number)**
Número de identificación único del vehículo a nivel mundial. Opcional en el MVP porque no todos los talleres lo registran.

**Clave del vehículo (Vehicle Key Code)**
Código numérico o alfanumérico del inmovilizador del vehículo. Se registra una vez al crear el vehículo y persiste entre visitas. Es del vehículo, no de la orden. Si el vehículo no tiene inmovilizador, `has_key = false` y `key_code` queda en `NULL`. Todos los roles activos del taller pueden verla.

**Estado de ingreso (Vehicle Intake)** ✏️
Registro del estado del vehículo al momento de recibirlo. Incluye: descripción de rayones/golpes/abolladuras (texto + fotos), estado de llantas, estado de vidrios, pertenencias dentro del vehículo, observaciones generales. **No incluye nivel de combustible.** **Fotos obligatorias (mínimo 4, configurable por taller).** Es histórico: no se modifica después de creado. Cada orden tiene su propio intake.

---

## C. Órdenes y trabajos

**Orden de trabajo (Work Order)**
Documento central del sistema. Representa la recepción de un vehículo en el taller para ser atendido. Tiene un número único por taller (ej: `OT-2026-0001`), fecha de ingreso, fecha estimada de entrega, fecha real de entrega, estado, cliente, vehículo, asesor responsable, y una lista de iteraciones. Una orden puede estar abierta por días o semanas. **No se elimina: se cancela.**

**Estado de la orden (Work Order Status)**
Ciclo de vida de una orden. Estados: `draft`, `received`, `inspecting`, `awaiting_approval`, `approved`, `in_progress`, `awaiting_parts`, `completed`, `delivered`, `cancelled`.

**Iteración de trabajo (Work Iteration)**
Concepto clave para modelar la realidad del taller: una orden puede tener múltiples iteraciones cuando surgen hallazgos adicionales. Cada iteración tiene su propio ciclo: hallazgo → diagnóstico → cotización → aprobación → reparación. Refleja casos donde se descubre una pieza desgastada al desmontar, se cotiza de nuevo, el cliente aprueba, y se continúa.

**Problema reportado (Reported Problem)**
Lo que el cliente dice que falla. Se registra al ingreso, en palabras del cliente. Es histórico, no se modifica. Es la base para la inspección. Ejemplo: "El carro hace un ruido en la parte delantera al frenar".

**Inspección (Inspection)** 🔗
Entidad separada. Revisión física del vehículo por parte de un mecánico. Puede ser visual, con herramientas de diagnóstico, o desarmando parcialmente. Genera hallazgos. Atributos: fecha, mecánico responsable, duración, observaciones. **Una inspección genera cero, uno o múltiples hallazgos.**

**Hallazgo (Finding)** 🔗
Lo que el mecánico encuentra durante la inspección. Es objetivo: "pastillas de freno desgastadas al 20%", "fuga de aceite en el cárter", "buje de suspensión roto". Puede tener fotos. Es histórico. **Un hallazgo puede generar múltiples diagnósticos.**

**Diagnóstico (Diagnosis)** 🔗
Explicación técnica del hallazgo. Responde a "¿por qué pasa esto?" y "¿qué implica?". Ejemplo: "El ruido al frenar se debe al desgaste de las pastillas, que a su vez es causado por discos rayados". Es histórico. **Múltiples diagnósticos por hallazgo.**

**Reparación recomendada (Recommended Repair)** 🔗
Lo que el mecánico propone hacer para resolver diagnóstico(s). Es una propuesta, no una obligación. **Puede aplicar a múltiples hallazgos.** Atributos: descripción, costo estimado, tiempo estimado, lista de hallazgos que resuelve, lista de repuestos e insumos necesarios.

**Reparación aprobada (Approved Repair)** 🔗
Lo que el cliente autoriza después de la cotización. **Aprobación por reparación individual, no por cotización completa.** Se registra quién aprobó (cliente), cuándo, y por qué canal (presencial, teléfono, WhatsApp). Puede ser parcial: el cliente aprueba algunas reparaciones y rechaza otras. Atributos: reparación referenciada, decisión, monto aprobado, canal, fecha, notas. Histórico.

**Reparación realizada (Performed Repair)**
Lo que realmente se hizo. Puede diferir de lo aprobado (por imprevistos, por decisión del mecánico, etc.). Tiene fecha, mecánico(s) responsable(s), tiempo real, y observaciones. Es histórico.

**Mano de obra (Labor)**
Trabajo humano realizado en una reparación. En este taller, **no influye en el costo final** (el costo es fijo por trabajo cotizado). Se registra el tiempo real (minutos) para métricas internas, y qué mecánico(s) participaron. No hay tarifa por hora en el MVP.

**Repuesto (Part)**
Pieza usada o pedida en una reparación. Atributos: nombre, código (opcional), proveedor, costo estimado, costo real, cantidad. Estado: `requested`, `received`, `installed`, `returned`, `pending`, `cancelled`.

**Insumo (Supply)** 🆕
Material consumible que no es una pieza (aceite, refrigerante, grasa, tornillería). **Entidad separada de repuesto.** Mismos atributos que repuesto, pero categoría distinta. En MVP: una tabla `items` con `type` (`part` | `supply`) para simplificar queries y UI.

**Cotización (Quote)** ✏️
Documento que resume el diagnóstico, las reparaciones recomendadas, los repuestos necesarios, los insumos, y el costo total. Se presenta al cliente para su aprobación. **Tiene fecha de expiración (default 7 días).** Su estado se deriva del estado de las reparaciones que contiene. Es histórica: no se modifica después de aprobada o rechazada.

**Aprobación (Approval)** 🔗
Registro de la decisión del cliente sobre **una reparación individual**. Atributos: reparación referenciada, decisión (`approved`, `rejected`), monto aprobado, canal (presencial/teléfono/WhatsApp), fecha, notas. Es histórica.

---

## D. Documentos y comunicación

**Informe inicial (Initial Report)**
Documento PDF que se envía al cliente al inicio del trabajo. Contiene: datos del cliente, datos del vehículo, problema reportado, inspección, hallazgos, diagnóstico, reparaciones recomendadas, cotización. Se genera en el cliente (navegador) y se comparte por WhatsApp o email.

**Informe final (Final Report)**
Documento PDF que se envía al cliente al finalizar el trabajo. Contiene: todo lo del informe inicial + reparaciones realizadas, repuestos usados, insumos, tiempo de trabajo, costo final, garantía. Se genera en el cliente y se comparte por WhatsApp o email.

**Garantía (Warranty)** ✏️
Compromiso del taller sobre una reparación o repuesto. **Cubre mano de obra y repuestos.** Atributos: descripción, fecha de inicio, fecha de vencimiento (ej: 1-2 semanas), condiciones, orden original referenciada. En MVP, es un texto descriptivo + fechas. No se modela cobertura detallada. Si el cliente vuelve por garantía, se crea una nueva orden vinculada a la original.

**Evidencia fotográfica (Photo Evidence)**
Fotografías tomadas durante el proceso: estado de ingreso, hallazgos, reparaciones, repuestos, entrega. Atributos: entidad referenciada (intake, finding, repair, etc.), path en Storage, timestamp, autor. **No se eliminan:** son parte del historial.

**Documento (Document)**
Archivo adjunto a una orden (factura externa, orden de compra de repuesto, etc.). En MVP, solo fotos y PDFs generados por el sistema. Documentos externos son Fase 2.

---

## E. Reportes y métricas

**Reporte de taller (Workshop Report)**
Vista de métricas para el dueño del taller. Ejemplos: órdenes abiertas vs cerradas por período, ingresos estimados, trabajos por mecánico, vehículos atendidos, tiempo promedio de reparación, tasa de aprobación de cotizaciones.

**Dashboard global (Global Dashboard)**
Vista de métricas para el dueño del SaaS. Ejemplos: talleres activos, usuarios por taller, órdenes creadas por taller, uso de storage, ingresos del SaaS. **Fase 2**, no MVP.

---

## F. Estados y transiciones

| Entidad           | Estados                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Orden de trabajo  | `draft`, `received`, `inspecting`, `awaiting_approval`, `approved`, `in_progress`, `awaiting_parts`, `completed`, `delivered`, `cancelled` |
| Cotización        | `draft`, `sent`, `partially_approved`, `approved`, `rejected`, `expired`                                                                   |
| Reparación        | `recommended`, `approved`, `rejected`, `in_progress`, `completed`, `cancelled`                                                             |
| Repuesto / Insumo | `requested`, `received`, `installed`, `returned`, `pending`, `cancelled`                                                                   |
| Usuario en taller | `active`, `inactive`, `invited`                                                                                                            |
| Taller            | `active`, `suspended`, `deleted` (soft delete, 90 días de retención, purga automática programada)                                          |

---

## G. Términos que NO usamos

- **"Falla"** → ambiguo. Usamos "problema reportado" o "hallazgo" según corresponda.
- **"Arreglo"** → coloquial. Usamos "reparación".
- **"Presupuesto"** → confundible con cotización. Usamos "cotización".
- **"Orden de servicio"** → en este sistema, "orden de trabajo" es el término oficial.
- **"Ticket"** → no aplica, es un taller, no un help desk.
- **"Cliente"** para referirse al taller → el taller es "taller", el cliente es el dueño del vehículo.

---

## H. Decisiones derivadas

- **D-01.** La orden de trabajo tiene iteraciones, no es un documento monolítico.
- **D-02.** Los conceptos del dominio son entidades separadas, no campos de texto. Problema reportado, hallazgo, diagnóstico, reparación recomendada, aprobada y realizada son entidades con su propio ciclo de vida.
- **D-03.** El vehículo es independiente del cliente. La relación es temporal (ownership).
- **D-04.** La cotización es una entidad, no un PDF. El PDF es una representación de la cotización.
- **D-05.** La aprobación es una entidad, no un campo booleano. Tiene canal, fecha, monto. Y es por reparación individual, no por cotización.
- **D-06.** La garantía es una entidad, no un campo de texto. Cubre mano de obra y repuestos.
- **D-07.** El tiempo de mano de obra es informativo, no afecta el costo.
- **D-08.** Los repuestos se piden a proveedores, no hay stock. Pero el estado del repuesto sí se trackea.
- **D-09.** Insumos separados de repuestos. En MVP, una tabla `items` con `type`.
- **D-10.** Fotos obligatorias en intake (mínimo 4, configurable por taller).
- **D-11.** Número de orden por taller, formato `OT-YYYY-NNNN`.
- **D-12.** Cotización expira a los 7 días (configurable).
- **D-13.** Inspección es entidad separada y genera hallazgos.
- **D-14.** Hallazgo → múltiples diagnósticos.
- **D-15.** Reparación recomendada → múltiples hallazgos (muchos-a-muchos).

---

## I. Preguntas abiertas (no bloqueantes)

1. **¿Un insumo puede ser reutilizable?** Ej: un bidón de aceite se usa en varias órdenes. Recomendación: en MVP, cada insumo se registra por orden con su cantidad. No hay stock.
2. **¿Un repuesto puede instalarse en múltiples órdenes?** No, un repuesto es para una orden específica.
3. **¿La cotización incluye insumos?** Sí, debe incluirlos.
4. **¿El cliente puede aprobar una reparación y rechazar otra dentro de la misma cotización?** Sí.
5. **¿Qué pasa si el cliente aprueba una reparación pero luego no se puede hacer?** Se marca como `cancelled` con motivo. Agregar campo `cancellation_reason`.
6. **¿La garantía se registra al cerrar la orden o al entregar?** Al cerrar la orden (estado `completed`). Se crea automáticamente con fecha de vencimiento configurable por taller.
7. **¿El informe final incluye la garantía?** Sí.
8. **¿Las fotos de intake son obligatorias también para vehículos con historial?** Sí, cada ingreso tiene su propio intake.
9. **¿El mecánico puede modificar el intake?** No, el intake es histórico. Si hay corrección, se agrega una nota.
10. **¿La purga automática de talleres a los 90 días se hace con qué mecanismo?** En free tier, cron externo (GitHub Actions) que llame a un RPC. En Pro, `pg_cron`. Documentar como ADR.

---

_Glosario del Dominio v2.0 — Sistema de Gestión para Taller Mecánico Automotriz_
_Documento vivo. Próxima revisión al cierre del modelo de datos._
