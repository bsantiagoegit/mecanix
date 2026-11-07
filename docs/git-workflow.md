# Flujo de Git

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Noviembre 2026

---

## Propósito

Definir cómo se trabaja con ramas, commits y merges para que el historial de `main` sea **lineal**: una sola línea de commits, sin commits de merge.

**Razón**: un historial lineal se lee de arriba abajo, simplifica `git bisect` y `git revert`, y evita los "rombos" que aparecen cuando varias ramas salen del mismo commit y se mergean con commits de merge. El costo (se pierde el agrupamiento visual de cada rama) se compensa con commits convencionales y scopes claros.

---

## Principios

1. `main` es lineal: nada de commits de merge.
2. **Nunca** se commitea directo en `main`: todo cambio sale de una rama corta.
3. **Nunca** se hace `push --force` a `main`.
4. Una rama, un propósito. Se borra al terminar.
5. Cada commit debe dejar el proyecto compilando y con los tests en verde.
6. Commits convencionales: `tipo(scope): descripción`.

---

## Configuración inicial (una vez por clon)

La configuración de Git vive en cada clon y **no se versiona**. Cada persona (y cada clon nuevo) debe ejecutar:

```bash
git config merge.ff only      # git merge se niega a crear commits de merge
git config pull.rebase true   # git pull hace rebase en lugar de merge
```

**Alcance real**: esto protege contra un `git merge` o `git pull` accidental. **No** impide un `git merge --no-ff` escrito a propósito, porque la opción explícita tiene prioridad sobre la configuración. La protección fuerte es la regla de GitHub descrita en [Ajustes recomendados en GitHub](#ajustes-recomendados-en-github).

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

El rebase reaplica los commits de la rama **encima** del `main` actual. Si hay conflictos, ver [Resolver conflictos](#resolver-conflictos-en-el-rebase).

### 4. Verificar

```bash
pnpm typecheck && pnpm test && pnpm build
```

### 5. Integrar en `main`

Hay dos vías. Ambas dejan el historial lineal.

**A. Localmente (fast-forward)**

```bash
git switch main
git merge --ff-only feat/lo-que-sea
git push origin main
```

`--ff-only` avanza el puntero de `main` sin crear commit de merge. Si falla con `Not possible to fast-forward`, `main` avanzó mientras trabajabas: vuelve al paso 3.

**B. Pull Request en GitHub**

Abrir el PR y mergearlo con una de estas opciones (nunca "Create a merge commit"):

| Opción               | Resultado                                   | Cuándo                                             |
| -------------------- | ------------------------------------------- | -------------------------------------------------- |
| **Rebase and merge** | Cada commit de la rama pasa a `main`        | Commits ya limpios y atómicos (opción por defecto) |
| **Squash and merge** | Un solo commit por PR (título convencional) | La rama tiene commits de trabajo en curso o ruido  |

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

Es el caso que generaba los rombos. Se integra la primera; la segunda se **rebasea sobre el `main` actualizado** antes de integrarla:

```bash
git switch segunda-rama
git fetch origin
git rebase origin/main
```

### Quiero deshacer algo ya publicado en `main`

Usa `git revert <hash>`: crea un commit nuevo que lo invierte y no reescribe el historial.

---

## Prohibido

- Commit directo en `main`.
- `git push --force` a `main` (ni siquiera con `--force-with-lease`).
- Commits de merge: `git merge --no-ff`, "Create a merge commit" en GitHub.
- Rebasear una rama que otra persona ya tomó como base.
- Reescribir historial de `main` ya publicado.

---

## Ajustes recomendados en GitHub

En **Settings → Rules** (o Branches), regla para `main`:

- **Require linear history**: rechaza cualquier merge commit. Es la protección que sí se puede imponer a todo el equipo.
- **Require a pull request before merging** (cuando haya más de una persona).
- **Block force pushes**.
- En **Settings → General → Pull Requests**: desactivar **Allow merge commits** y dejar solo **Allow squash merging** y **Allow rebase merging**.
- Activar **Automatically delete head branches**.

---

## Historial previo

El historial hasta el commit `32b18ca` contiene commits de merge, del flujo anterior. No se reescribe: el historial lineal rige a partir de los siguientes merges.

---

## Referencias

- [README de documentación](./README.md)
- Reglas generales del proyecto: `CLAUDE.md`

---

_Flujo de Git v1.0_
