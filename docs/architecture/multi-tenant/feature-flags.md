# Feature Flags

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Documentar la estrategia de feature flags. Aclarar por qué **no** se implementan en MVP.

---

## Qué son feature flags

Un feature flag es un mecanismo para activar o desactivar código en runtime sin hacer deploy.

**Casos de uso típicos**:

- Activar una funcionalidad nueva a un % de usuarios (canary release).
- Desactivar una funcionalidad si causa problemas (kill switch).
- Dar acceso beta a algunos usuarios.
- Hacer A/B testing.

**Herramientas**: LaunchDarkly, Unleash, Flagsmith.

---

## Diferencia con configuración por taller

**No son lo mismo**.

| Aspecto           | Feature flag                     | Configuración por taller          |
| ----------------- | -------------------------------- | --------------------------------- |
| Propósito         | Activar código nuevo en runtime  | Ajustar comportamiento por tenant |
| Temporalidad      | Corto plazo (días/semanas)       | Largo plazo (siempre)             |
| Quién lo controla | Equipo de desarrollo             | Owner del taller o SaaS admin     |
| Dónde vive        | Servicio externo                 | Columna en `workshops`            |
| Ejemplo           | "Activar el nuevo editor al 10%" | `quote_expiration_days = 15`      |

**Tu caso es configuración por taller, no feature flags**.

---

## Por qué NO implementar feature flags en MVP

1. **No hay nada que flagear**. Con 1 taller y 1 desarrollador, todo el código es para ese taller.
2. **Agrega complejidad**. Servicio externo, dependencia, SDK, dashboard.
3. **No resuelve el problema real**. El problema es "cada taller tiene configuraciones distintas", no "activar código nuevo".
4. **Se puede agregar después sin refactor**. Si en el futuro se necesita, se agrega sin tocar el código existente.

---

## Cuándo evaluar feature flags

### Fase 2 (2-5 talleres)

**Configuración por taller**: columnas explícitas en `workshops`.
**Funcionalidades por taller**: tabla `workshop_features`.
**Feature flags**: **no**.

### Fase 3 (10+ talleres)

**Feature flags**: evaluar.

**Criterios**:

- Hay funcionalidades en beta que se quieren probar con algunos talleres.
- Se necesita hacer kill switch rápido sin deploy.
- Hay 2+ desarrolladores.
- El costo de la herramienta se justifica.

**Herramientas a evaluar**:

- **Unleash** (self-hosted, open-source, gratis).
- **Flagsmith** (SaaS con free tier generoso).
- **LaunchDarkly** (SaaS, caro, pero potente).

---

## Cómo se implementaría (si se decidiera)

### 1. Elegir herramienta

**Recomendación**: Unleash self-hosted. Gratis, open-source, control total.

### 2. Agregar SDK al frontend

```typescript
import { UnleashClient } from 'unleash-proxy-client';

const unleash = new UnleashClient({
  url: 'https://unleash.example.com/api/frontend',
  clientKey: 'xxx',
  appName: 'taller-os-web',
});

unleash.on('ready', () => {
  const isEnabled = unleash.isEnabled('new-quote-editor');
  console.log('New editor enabled:', isEnabled);
});
```

### 3. Usar en componentes

```html
@if (isEnabled('new-quote-editor')) {
<app-new-quote-editor />
} @else {
<app-old-quote-editor />
}
```

### 4. Configurar en el dashboard de Unleash

- Crear el flag `new-quote-editor`.
- Configurar a qué talleres aplica (por `workshop_id`).
- Activar el rollout.

---

## Recomendación final

**No implementar feature flags en MVP**.

**Si en el futuro se decide implementar**, hacerlo con **Unleash self-hosted**.

**Documentar la decisión** en ADR-011.

---

## Referencias

- [README de multi-tenant](./README.md)
- [Decisiones transversales](./decisions.md)
- [ADR-011: Feature flags](../adr/ADR-011-feature-flags.md)
- [Unleash](https://www.getunleash.io/)
- [Flagsmith](https://flagsmith.com/)
- [LaunchDarkly](https://launchdarkly.com/)

---

_Feature Flags v1.0_
