# Árbol de Decisión

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Proporcionar un **árbol de decisión** para elegir la herramienta correcta según el tipo de estado.

---

## Árbol

```
¿El estado viene de Supabase y es para mostrar?
├─ Sí → resource + data service
└─ No → ¿El estado es global (compartido entre features)?
        ├─ Sí → ¿Tiene lógica asíncrona compleja?
        │      ├─ Sí → NgRx
        │      └─ No → Signal en servicio global
        └─ No → ¿El estado es de un formulario?
                ├─ Sí → Reactive Forms
                └─ No → ¿El estado es derivado de otro?
                        ├─ Sí → computed()
                        └─ No → ¿Es efímero (modal, tab, focus)?
                                ├─ Sí → Signal local del componente
                                └─ No → ¿Es estado de feature (filtros)?
                                        ├─ Sí → Signal en servicio del feature
                                        └─ No → Signal local del componente
```

---

## Ejemplos resueltos

### Ejemplo 1: Lista de órdenes

**Pregunta**: ¿Dónde vive la lista de órdenes?

**Respuesta**:

- ¿Viene de Supabase? Sí.
- ¿Es para mostrar? Sí.
- → `resource` en el contenedor.

### Ejemplo 2: Taller activo

**Pregunta**: ¿Dónde vive el taller activo?

**Respuesta**:

- ¿Viene de Supabase? Sí, pero se cachea localmente.
- ¿Es global? Sí, todo lo usa.
- ¿Tiene lógica asíncrona compleja? Sí (cambiar de taller).
- → NgRx (`workshops`).

### Ejemplo 3: Filtros de lista de órdenes

**Pregunta**: ¿Dónde viven los filtros?

**Respuesta**:

- ¿Viene de Supabase? No.
- ¿Es global? No, solo el feature `work-orders`.
- ¿Es de un formulario? No.
- ¿Es derivado? No.
- ¿Es efímero? No, persiste entre navegaciones dentro del feature.
- ¿Es estado de feature? Sí.
- → Signal en servicio del feature (`WorkOrderFiltersState`).

### Ejemplo 4: Modal de cancelación

**Pregunta**: ¿Dónde vive `showCancelModal`?

**Respuesta**:

- ¿Viene de Supabase? No.
- ¿Es global? No.
- ¿Es de un formulario? No.
- ¿Es derivado? No.
- ¿Es efímero? Sí.
- → Signal local del componente.

### Ejemplo 5: Total de cotización

**Pregunta**: ¿Dónde vive `totalCost`?

**Respuesta**:

- ¿Viene de Supabase? No, se calcula.
- ¿Es derivado? Sí.
- → `computed()`.

### Ejemplo 6: Borrador de orden

**Pregunta**: ¿Dónde vive el borrador?

**Respuesta**:

- ¿Viene de Supabase? No.
- ¿Es global? No.
- ¿Es de un formulario? Sí.
- ¿Persiste? Sí.
- → Reactive Forms + `localStorage` vía `effect()`.

---

## Preguntas frecuentes

### ¿Por qué no NgRx para la lista de órdenes?

Porque es server state. NgRx no aporta valor para datos que vienen de Supabase. `resource` maneja loading, error y refresh automáticamente.

### ¿Por qué signals y no RxJS?

Signals es el mecanismo nativo de Angular 21 para estado reactivo. RxJS sigue siendo útil para streams de eventos (websockets, formularios), pero para estado, signals es más simple y no requiere `subscribe`.

### ¿Por qué `computed()` y no `effect()`?

`computed()` es lazy y sin side effects. `effect()` es eager y está diseñado para sincronización externa. Usar `effect()` para derivar estado es un antipatrón.

### ¿Por qué no persistir todo en `localStorage`?

Porque `localStorage` tiene límite de 5-10 MB. Persistir todo lo llena. Solo se persiste lo necesario (borradores, preferencias, sesión parcial).

### ¿Por qué no NgRx para los formularios?

Porque Reactive Forms ya tiene su propio modelo de estado (value, valid, dirty, touched). Sincronizar con NgRx agrega complejidad sin beneficio.

---

## Referencias

- [README de state-management](./README.md)
- [Taxonomía](./taxonomy.md)
- [Antipatrones](./antipatterns.md)

---

_Árbol de Decisión v1.0_
