# Flujo de Git

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.2
- **Fecha:** Noviembre 2026

---

## Propósito

Definir cómo se trabaja con ramas, commits y merges para que el historial de `main` sea **lineal**: una sola línea de commits, sin commits de merge.

**Razón**: un historial lineal se lee de arriba abajo, simplifica `git bisect` y `git revert`, y evita los "rombos" que aparecen cuando varias ramas salen del mismo commit y se mergean con commits de merge. El costo (se pierde el agrupamiento visual de cada rama) se compensa con commits convencionales y scopes claros.

---

## Principios

1. `main` es lineal: nada de commits de merge.
2. **Nunca** se commitea ni se hace push directo a `main`: todo cambio sale de una rama corta y entra por **Pull Request** con el CI en verde.
3. **Nunca** se hace `push --force` a `main`.
4. Una rama, un propósito. Se borra al terminar.
5. Cada commit debe dejar el proyecto compilando y con los tests en verde.
6. Commits convencionales: `tipo(scope): descripción`.
7. `main` está protegido por un ruleset de GitHub (ver [Protección de `main`](#protección-de-main)): lo que aquí se describe lo impone el servidor, no solo la costumbre.

---

## Configuración inicial (una vez por clon)

La configuración de Git vive en cada clon y **no se versiona**. Cada persona (y cada clon nuevo) debe ejecutar:

```bash
git config merge.ff only      # git merge se niega a crear commits de merge
git config pull.rebase true   # git pull hace rebase en lugar de merge
```

**Alcance**: esto protege contra un `git merge` o `git pull` accidental. No impide un `git merge --no-ff` escrito a propósito (la opción explícita tiene prioridad sobre la configuración); eso lo frena el hook `pre-merge-commit`, descrito en [Hooks de Git](#hooks-de-git).

---

## Ramas

Nombre: `tipo/descripcion-corta` en minúsculas y con guiones, con el mismo `tipo` de los commits.

| Prefijo     | Uso                                   | Ejemplo                       |
| ----------- | ------------------------------------- | ----------------------------- |
| `feat/`     | Funcionalidad nueva                   | `feat/workshop-onboarding`    |
| `fix/`      | Corrección de un defecto              | `fix/login-redirect`          |
| `refactor/` | Cambio interno sin cambio de conducta | `refactor/core-store-folders` |
| `docs/`     | Solo documentación                    | `docs/git-workflow`           |
| `test/`     | Solo tests                            | `test/auth-service`           |
| `chore/`    | Configuración, dependencias, tooling  | `chore/supabase-local-config` |

Las ramas son **cortas**: días, no semanas. Cuanto más viva una rama, más se aleja de `main` y más conflictos trae el rebase.

---

## Flujo paso a paso

### 1. Partir de `main` actualizado

```bash
git switch main
git pull            # con pull.rebase=true y main limpio equivale a un fast-forward
git switch -c feat/lo-que-sea
```

### 2. Trabajar y commitear

Commits pequeños y atómicos, con el formato de [Commits](#commits).

### 3. Ponerse al día con `main` antes de integrar

```bash
git fetch origin
git rebase origin/main
```

El rebase reaplica los commits de la rama **encima** del `main` actual. Si hay conflictos, ver [Resolver conflictos](#resolver-conflictos-en-el-rebase). GitHub exige que el PR esté al día con `main` para poder integrarlo.

### 4. Verificar

```bash
pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

### 5. Integrar en `main` (Pull Request)

`main` está protegido: un `git push origin main` es rechazado. Todo entra por Pull Request.

```bash
git push -u origin feat/lo-que-sea     # el hook pre-push corre typecheck y tests
```

1. Abre el PR en GitHub (tras el push aparece el aviso **Compare & pull request**). El **título** debe tener el formato de commit, `tipo(scope): descripción`: con Squash es el mensaje final del commit en `main`, y los hooks locales no corren en GitHub.
2. Espera los dos checks de CI (ver [CI](#ci-github-actions)). Son obligatorios.
3. Integra con una de estas opciones. "Create a merge commit" no existe: está desactivada.

| Opción               | Resultado                                   | Cuándo                                             |
| -------------------- | ------------------------------------------- | -------------------------------------------------- |
| **Rebase and merge** | Cada commit de la rama pasa a `main`        | Commits ya limpios y atómicos (opción por defecto) |
| **Squash and merge** | Un solo commit por PR (título convencional) | La rama tiene commits de trabajo en curso o ruido  |

**Auto-merge**: en lugar de esperar al CI, pulsa **Enable auto-merge**; el PR se integra solo cuando los checks pasan.

**Si `main` avanzó** y el PR muestra que la rama está desactualizada: haz `git fetch origin && git rebase origin/main && git push --force-with-lease`, o usa el botón **Update branch → Update with rebase**. **No** uses "Update with merge commit": mete un commit de merge en tu rama.

### 6. Limpiar

GitHub borra la rama remota al integrar el PR. En local:

```bash
git switch main && git pull
git fetch --prune
git branch -d feat/lo-que-sea
```

Con **Rebase and merge** y **Squash and merge**, `main` recibe commits con hashes nuevos, así que Git no reconoce la rama como integrada y `git branch -d` responde `not fully merged`. Si el PR figura como integrado en GitHub, bórrala con `git branch -D feat/lo-que-sea`.

-------------------- | ------------------------------------------- | -------------------------------------------------- |
| **Rebase and merge** | Cada commit de la rama pasa a `main` | Commits ya limpios y atómicos (opción por defecto) |
| **Squash and merge** | Un solo commit por PR (título convencional) | La rama tiene commits de trabajo en curso o ruido |

### 6. Limpiar

```bash
git branch -d feat/lo-que-sea                  # local; -d solo borra si está integrada
git push origin --delete feat/lo-que-sea       # remota, si se subió
```

---

## Commits

Formato: `tipo(scope): descripción`

- **Tipos**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- **Scope**: el feature o módulo afectado (`auth`, `core`, `db`, `supabase`, `work-orders`, ...).
- **Idioma**: inglés. Imperativo y en minúsculas: `add`, `fix`, `remove`.
- **Cuerpo** (opcional): viñetas que expliquen el _qué_ y el _porqué_.
- Un `refactor` no es un `feat`: si no cambia la conducta, no uses `feat`.

```
fix(auth): navigate after login and show login errors

- LoginPage never navigated after a successful login
- surface auth errors with a readable message
```

Ejemplos: `feat(work-orders): add intake photo validation`, `docs(git): document linear-history workflow`.

---

## Situaciones frecuentes

### Resolver conflictos en el rebase

```bash
# 1. editar los archivos en conflicto
git add <archivo>
git rebase --continue
# para cancelar y volver al estado anterior:
git rebase --abort
```

### Rebasé una rama que ya había subido

El rebase cambia los hashes, así que el push normal es rechazado. Usa:

```bash
git push --force-with-lease
```

`--force-with-lease` falla si alguien más subió algo a esa rama, a diferencia de `--force`. **Solo en tu propia rama, nunca en `main`.**

### Dos ramas salen del mismo commit

Es el caso que generaba los rombos. Se integra la primera por PR; la segunda se **rebasea sobre el `main` actualizado** antes de integrarla:

```bash
git switch segunda-rama
git fetch origin
git rebase origin/main
git push --force-with-lease
```

### Un check de CI falla y no tiene que ver con mi cambio

Si el paso que falla es de infraestructura (descarga de imágenes, red, `Start local Supabase`) y el mismo job pasó en otras ejecuciones, vuelve a lanzarlo: en el PR, **Details → Re-run failed jobs** (solo repite el job fallido). Si falla de forma repetida con el mismo error, es un problema real y hay que corregirlo.

### `git push origin main` es rechazado

Es lo esperado: `main` solo se actualiza por Pull Request. Sube tu rama (`git push -u origin <rama>`) y abre el PR.

### El CI está caído y no puedo integrar

Los checks son obligatorios, así que un fallo de GitHub Actions bloquea la integración. Como último recurso: **Settings → Rules → Rulesets → `main protection` → Enforcement status → Disabled**, integra, y vuelve a ponerlo en **Active** de inmediato. Si pasa seguido, considera agregar un bypass para el administrador.

### Quiero deshacer algo ya publicado en `main`

Usa `git revert <hash>`: crea un commit nuevo que lo invierte y no reescribe el historial.

---

## Hooks de Git

Viven en `.githooks/` (versionados, sin dependencias) y se activan solos al ejecutar `pnpm install`, que corre el script `prepare` (`git config core.hooksPath .githooks`). Para activarlos a mano: `git config core.hooksPath .githooks`.

| Hook               | Cuándo corre                | Qué hace                                                                                                                     |
| ------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `commit-msg`       | Al crear un commit          | Exige `tipo(scope): descripción` (tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`) y máximo 72 caracteres.         |
| `pre-commit`       | Al crear un commit          | Bloquea commits en `main` y revisa con Prettier solo los archivos staged.                                                    |
| `pre-merge-commit` | Al crear un commit de merge | Siempre lo rechaza: mantiene `main` lineal incluso con `--no-ff`.                                                            |
| `pre-push`         | Al hacer `git push`         | Rechaza commits de merge nuevos hacia `main` y corre `typecheck` y los tests unitarios. Borrar una rama remota no los corre. |

Los mensajes que Git genera solos (`Merge ...`, `Revert "..."`, `fixup!`, `squash!`) no se validan.

**Límites**: se saltan con `--no-verify`, solo existen en los clones donde estén activados, y no sustituyen a CI. Si un hook falla, corrige la causa en vez de saltarlo. Para formatear: `pnpm format`.

---

## CI (GitHub Actions)

El workflow `.github/workflows/ci.yml` corre en cada Pull Request y en cada push a `main`. Es la barrera que no depende de que cada persona tenga los hooks activos.

| Job                                            | Qué ejecuta                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Quality (format, types, unit tests, build)** | `pnpm format:check`, `pnpm typecheck`, `pnpm test --watch=false`, `pnpm build`                  |
| **Database (RLS and triggers)**                | Levanta un Supabase local mínimo (`db`, `auth`, `kong`, `rest`) y corre `pnpm test:integration` |

**Equivalente local** del job de calidad: `pnpm format:check && pnpm typecheck && pnpm test --watch=false && pnpm build`. El de base de datos necesita Docker (Colima) y `supabase start`.

**Convenciones del workflow**:

- Las Actions están fijadas por **SHA de commit** (con el tag en un comentario), no por tag móvil. Dependabot propone las actualizaciones semanalmente (`.github/dependabot.yml`).
- Token de solo lectura (`permissions: contents: read`), `timeout-minutes` en cada job y cancelación de runs obsoletos de una misma rama o PR.
- La versión de Node sale de `.nvmrc`; la de pnpm, del campo `packageManager` de `package.json`.
- pnpm 11 aborta la instalación si una dependencia tiene scripts de build sin aprobar. Las aprobadas están en `pnpm-workspace.yaml` (`allowBuilds`); al agregar una dependencia con scripts nativos, ejecuta `pnpm approve-builds`.
- El arranque de Supabase se **reintenta hasta 3 veces**, limpiando contenedores entre intentos: `public.ecr.aws` limita las descargas anónimas (`toomanyrequests`) y un arranque fallido puede dejar un contenedor ocupando el puerto 54322.
- No hay secretos: el Supabase de CI usa las claves de demostración locales.

**Todavía no incluye**: tests E2E con Playwright ni despliegue. El despliegue iría en un workflow aparte, con un entorno protegido de GitHub y los secretos reales.

---

## Prohibido

- Commit o push directo a `main` (el ruleset lo rechaza).
- `git push --force` a `main` (ni siquiera con `--force-with-lease`).
- Commits de merge: `git merge --no-ff`, "Create a merge commit" y "Update with merge commit" en GitHub.
- Rebasear una rama que otra persona ya tomó como base.
- Reescribir historial de `main` ya publicado.

---

## Protección de `main`

La protección vive en GitHub, no en el repositorio: si se recrea el repo o se cambia de organización hay que volver a aplicarla.

**Ruleset `main protection`** (Settings → Rules → Rulesets). Estado `Active`, objetivo: la rama por defecto, lista de bypass vacía.

| Regla                                 | Configuración                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Restrict deletions                    | Activada                                                                                                |
| Block force pushes                    | Activada                                                                                                |
| Require linear history                | Activada: rechaza commits de merge                                                                      |
| Require a pull request before merging | Activada, 0 aprobaciones (proyecto de una persona), métodos permitidos: **Squash** y **Rebase**         |
| Require status checks to pass         | `Quality (format, types, unit tests, build)` y `Database (RLS and triggers)`, con "up to date" activado |

**Settings → General → Pull Requests**:

- **Allow merge commits**: desactivado. **Allow squash merging** y **Allow rebase merging**: activados.
- Squash, _Default commit message_: **Pull request title**.
- **Always suggest updating pull request branches**: activado.
- **Allow auto-merge**: activado.
- **Automatically delete head branches**: activado.

Con más de una persona, subir las aprobaciones requeridas por encima de 0.

---

## Historial previo

El historial hasta el commit `32b18ca` contiene commits de merge, del flujo anterior. No se reescribe: el historial lineal rige a partir de los siguientes merges.

---

## Referencias

- [README de documentación](./README.md)
- Reglas generales del proyecto: `CLAUDE.md`

---

_Flujo de Git v1.2_
