# ADR-016: Versiones exactas de las dependencias, con actualización manual

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-11
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

`pnpm add` guarda por defecto un rango con `^` (`"^2.117.3"`: acepta cualquier 2.x posterior). El `pnpm-lock.yaml` fija lo que se instala hoy, pero el rango del `package.json` permite que la próxima vez que alguien resuelva el lockfile (`pnpm update`, borrar el lockfile, o un `pnpm install` que lo regenere) entren versiones nuevas sin que nadie las haya decidido. Pasó al revisar esto: al regenerar el lockfile, `pnpm install` movió dependencias transitivas (`semver`, `picomatch`) sin que se hubiera pedido.

Para una app que vamos a mantener, una actualización debe ser un **cambio consciente**: leer el changelog, probar y dejarlo en su propio commit.

---

## Decisión

1. **Todas las dependencias de `package.json` llevan una versión exacta**, sin `^` ni `~` (`"@supabase/supabase-js": "2.117.3"`), tanto en `dependencies` como en `devDependencies`.
2. **Se instalan así por defecto**: `pnpm-workspace.yaml` tiene `savePrefix: ''`, así que `pnpm add <paquete>` guarda la versión que instala, sin rango. No hace falta recordar `-E`.
3. **Las actualizaciones son manuales y controladas** (ver el procedimiento en [`docs/git-workflow.md`](../../git-workflow.md#dependencias-versiones-exactas-y-actualización-manual)): una rama `chore/` por paquete o por grupo que sube junto (p. ej. Angular), con el changelog leído y la suite completa en verde.
4. **`pnpm-lock.yaml` se versiona siempre** y la CI instala con `--frozen-lockfile`: lo que se prueba es exactamente lo que está en el repositorio, incluidas las dependencias transitivas.
5. **No se automatizan las subidas de paquetes npm**: `.github/dependabot.yml` solo cubre las GitHub Actions (que ya van fijadas por SHA). No se añade el ecosistema `npm`.
6. **Lo mismo para lo que no pasa por `package.json`**: las importaciones `npm:` de las Edge Functions llevan versión exacta (`npm:@supabase/supabase-js@2.117.3`), y `packageManager` fija pnpm.

Las versiones que quedaron fijadas son las que ya estaban instaladas en el lockfile: pasar a exactas no cambió ningún paquete.

---

## Alternativas consideradas

### Alternativa A: Rangos con `^` y confiar en el lockfile

- **Ventajas**: el valor por defecto de pnpm; el `package.json` dice "qué línea de versiones".
- **Desventajas**: el rango autoriza actualizaciones que nadie decidió en cuanto el lockfile se regenera; el `package.json` no refleja lo que realmente corre.
- **Razón de descarte**: el control que se busca no depende de que nadie regenere nunca el lockfile.

### Alternativa B: Renovate o Dependabot para npm

- **Ventajas**: avisan de versiones nuevas y de avisos de seguridad.
- **Desventajas**: abren PRs sin que se pidan; hay que revisarlos y mantener su configuración.
- **Razón de descarte**: no se quiere actualización automática. Se puede reconsiderar solo para avisos de seguridad (Dependabot security updates), que no suben versiones por sí solos.

---

## Consecuencias

### Positivas

- El `package.json` dice exactamente qué versión corre; no hay sorpresas al regenerar el lockfile.
- Cada actualización queda como un commit propio, revisable y reversible.

### Negativas

- Nadie avisa de versiones nuevas ni de parches de seguridad: hay que revisar `pnpm outdated` y `pnpm audit` de vez en cuando (por ejemplo, al empezar cada fase).
- Las actualizaciones cuestan trabajo manual, sobre todo las que van juntas (Angular, NgRx, Vitest).
- `ng update` y `pnpm up` pueden reescribir rangos; hay que volver a dejar versiones exactas antes del commit.

### Neutras

- Las dependencias transitivas las fija el lockfile, no el `package.json`; esta decisión no las toca.
