# Estructura de la documentación y cómo replicarla

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Noviembre 2026

---

## Propósito

Explica **por qué** `docs/` está organizado como está, **qué hay** en cada carpeta, **qué archivos** hay que crear y **de dónde sale** la información de cada uno. Sirve para dos cosas:

1. Que quien llegue a este proyecto entienda dónde buscar y dónde escribir.
2. Que se pueda **reproducir la misma organización en otro proyecto multi-tenant**, distinguiendo lo que se copia tal cual de lo que pertenece a este proyecto y hay que reemplazar.

El índice de lectura del proyecto está en [`README.md`](./README.md); este documento es la guía del **método**, no del contenido.

---

## 1. Por qué esta organización

### 1.1 Cinco preguntas, cinco carpetas

La documentación responde preguntas distintas, hechas por personas distintas y en momentos distintos. Cada pregunta tiene su carpeta:

| Pregunta                                  | Carpeta                                | Quién la hace            |
| ----------------------------------------- | -------------------------------------- | ------------------------ |
| **¿Qué** construye el sistema y para qué? | [`domain/`](./domain/)                 | Negocio, producto, todos |
| **¿Cómo** se construye (técnica)?         | [`architecture/`](./architecture/)     | Desarrollo               |
| **¿Cómo se ve** y cómo se usa?            | [`design/`](./design/)                 | Frontend, diseño         |
| **¿Cómo se comprueba** que funciona?      | [`testing/`](./testing/)               | Desarrollo, calidad      |
| **¿Cómo se trabaja** en el repositorio?   | [`git-workflow.md`](./git-workflow.md) | Todo el equipo           |

Separar el **qué** del **cómo** es la decisión central: el negocio cambia por motivos distintos que la tecnología, y mezclarlos hace que un cambio de base de datos obligue a reescribir una definición de negocio (o al revés).

### 1.2 El dominio manda

`domain/` es la **fuente de verdad**. Si el código o `architecture/` contradicen al dominio, el que está mal es el código o la arquitectura, no el dominio. Esa jerarquía evita discusiones: cuando algo no cuadra, se corrige hacia el dominio, o se cambia el dominio **primero** y de forma explícita.

```
domain/  →  architecture/  →  código
(qué)        (cómo)            (lo que corre)
```

### 1.3 Documentar primero, programar después

El orden de trabajo es: dominio → modelo de datos → seguridad → arquitectura → código, y cada feature se documenta (casos de uso) antes de implementarse. Las reglas duras del proyecto (`CLAUDE.md`) lo refuerzan: no se toca la base de datos sin actualizar `architecture/data-model/`, no se añade una dependencia sin un ADR.

Por qué compensa:

- Las decisiones caras de revertir (modelo de datos, RLS, multi-tenant) se discuten **una vez**, por escrito.
- Un recién llegado (persona o asistente de IA) puede implementar un caso de uso sin reunirse con nadie.
- Las pruebas salen de los casos de uso: cada flujo alternativo documentado es un test por escribir.

### 1.4 Seis mecanismos que se repiten en todas las carpetas

Lo que hace que 100+ archivos sean navegables no es el tema sino que **todas las carpetas siguen las mismas reglas**:

| Mecanismo                              | Cómo funciona                                                                                                                                                               | Para qué sirve                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **`README.md` en cada carpeta**        | Cabecera con versión y fecha, **Propósito**, qué **no** incluye, **Orden de lectura**, **Principios**, tabla de **Estado actual**, **Referencias**.                         | Cada carpeta es autocontenida y se puede leer de arriba abajo.                                       |
| **Archivo `decisions.md`**             | Decisiones transversales numeradas con prefijo propio del área (`D-RLS-01`, `D-FE-07`, `D-ST-14`…): título, decisión, **razón**, alternativa descartada.                    | Las decisiones viven en un solo lugar y no se repiten en cada archivo.                               |
| **IDs estables**                       | `UC-XXX-NN` casos de uso, `RT-NN` reglas de negocio, `T-NN` transiciones, `ADR-NNN` decisiones, `D-<ÁREA>-NN` decisiones por área. **Nunca se renumeran ni se reutilizan.** | Se puede referenciar un concepto desde el código, un commit o una prueba sin que el enlace se rompa. |
| **Frontera "No incluye"**              | Cada README dice qué deja fuera y a dónde ir a buscarlo.                                                                                                                    | Evita duplicar contenido y que dos archivos se contradigan.                                          |
| **Plantillas** (`_template.md`)        | Un molde para los documentos repetibles (casos de uso, ADR).                                                                                                                | Todos los archivos del mismo tipo tienen la misma forma.                                             |
| **Versión + fecha + "documento vivo"** | Cada documento declara su versión, y su pie dice que se actualiza.                                                                                                          | Se sabe qué tan vigente está algo, y se espera que cambie.                                           |

Además, los documentos se enlazan con rutas **relativas**, así el árbol se puede mover o copiar a otro repositorio sin romper enlaces.

### 1.5 Idiomas

- **La documentación se escribe en español** (la lengua del negocio y del equipo); **el código, en inglés**. Los nombres de archivo de `docs/` están en inglés para que se parezcan a los del código y a las convenciones habituales (`README.md`, `decisions.md`).
- El lenguaje del negocio lo fija el **glosario**: no se inventan términos fuera de él.

---

## 2. Mapa completo

```
docs/
├── README.md                    Índice raíz: áreas, orden de lectura, convenciones
├── documentation-structure.md   Este documento (el método)
├── git-workflow.md              Proceso: ramas, commits, PR, CI, dependencias
│
├── domain/                      QUÉ — el negocio (fuente de verdad)
│   ├── README.md
│   ├── glossary.md              Lenguaje ubicuo
│   ├── actors-and-roles.md      Quién hace qué (matriz de permisos)
│   ├── state-machine.md         Ciclo de vida de la entidad central
│   ├── business-rules.md        Reglas transversales RT-NN
│   ├── use-cases/               Casos de uso, un archivo por feature
│   │   ├── README.md            Índice y conteo por prioridad
│   │   ├── _template.md
│   │   └── 01-auth.md … 15-…md
│   └── conceptual-model/        Entidades y relaciones, sin tecnología
│       ├── README.md
│       ├── entities.md
│       ├── erd.md
│       └── open-questions.md
│
├── architecture/                CÓMO — decisiones técnicas
│   ├── README.md
│   ├── adr/                     Decisiones con contexto y alternativas
│   ├── data-model/              Esquema relacional (tablas, triggers)
│   ├── security/                RLS: helpers, vistas, policies por grupo de tablas
│   ├── storage/                 Archivos binarios: buckets, paths, políticas, límites
│   ├── multi-tenant/            Aislamiento, configuración por inquilino, onboarding
│   ├── frontend/                Estructura de carpetas, features, flujo de datos, rutas
│   ├── state-management/        Qué estado vive dónde
│   └── pwa-offline/             Service worker, manifest, red, instalación
│
├── design/                      CÓMO SE VE — sistema de diseño
└── testing/                     CÓMO SE COMPRUEBA — estrategia y convenciones
```

Fuera de `docs/` hay documentación que forma parte del mismo sistema:

| Ubicación                        | Qué es                                                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` (raíz)               | Punto de entrada para el asistente de IA: orden de lectura, **reglas duras**, orden de implementación, cómo referenciar IDs.                                                  |
| `src/app/features/<x>/README.md` | **Un README por feature**: casos de uso que cubre y su estado, estructura, rutas, decisiones locales, pruebas. Es la documentación que vive pegada al código y cambia con él. |
| `supabase/migrations/`           | El esquema ejecutable. `architecture/data-model/` es su fuente de verdad: se actualiza primero el documento y luego la migración.                                             |
| `.ai/` (no versionada aquí)      | Contexto condensado y convenciones para el asistente de IA (`CONTEXT.md`, `AGENTS.md`, `CONVENTIONS.md`, `WORKFLOW.md`).                                                      |

---

## 3. Carpeta por carpeta

Para cada archivo: **qué contiene**, **por qué existe** y **de dónde sale la información**.

### 3.1 `domain/` — el negocio

**Objetivo**: describir el negocio sin mencionar tecnología. Es lo único que se valida con quien conoce el oficio (el taller).

| Archivo                               | Qué contiene                                                                                                                                                                                                                                                                           | Por qué existe                                                                                                  | De dónde sale                                                                                                                                                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `glossary.md`                         | Cada término del negocio con su definición ("Orden de trabajo", "Placa", "Clave del vehículo"…), agrupado por área, con una sección de **términos que NO se usan** y otra de decisiones derivadas. Marca el **idioma** de todo lo demás.                                               | Que negocio, documentos y código llamen igual a lo mismo. Evita sinónimos que acaban siendo dos tablas.         | Entrevistas con el taller y casos reales; se amplía cada vez que aparece una palabra nueva. Primer documento que se escribe.                                                                                                 |
| `actors-and-roles.md`                 | Actores (incluidos los que **no** son usuarios del sistema) y la **matriz de permisos** acción × rol.                                                                                                                                                                                  | Es la fuente de las policies de seguridad, de los guards del frontend y de los permisos de cada caso de uso.    | Entrevistas: "¿quién puede hacer qué?". Después se contrasta con cada caso de uso.                                                                                                                                           |
| `state-machine.md`                    | Estados de la entidad central (la orden), cuáles son terminales y las transiciones numeradas `T-NN` con su actor y sus condiciones.                                                                                                                                                    | El flujo de trabajo es la parte más propensa a errores; un diagrama evita estados imposibles.                   | Recorrido del proceso real del taller de punta a punta (de la recepción a la entrega).                                                                                                                                       |
| `business-rules.md`                   | Reglas transversales `RT-NN`: enunciado, **cómo se implementa** y **qué prueba la cubre**.                                                                                                                                                                                             | Reglas que atraviesan varios features ("el vehículo es independiente del cliente") no pueden vivir en uno solo. | Entrevistas y casos límite que el negocio exige; cada regla enlaza a su implementación y a su test (trazabilidad).                                                                                                           |
| `use-cases/` (un archivo por feature) | Por feature: objetivo, actores, dependencias, tabla de casos con prioridad (MVP / Fase 2 / Fase 3), **cada caso** con precondiciones, flujo principal, flujos alternativos, reglas, datos involucrados y resultado; reglas de datos y validaciones, notas de UI/UX y tabla de testing. | Define **qué se construye** y es la base del código y de las pruebas.                                           | Del glosario, los actores y las reglas, más conversaciones con el negocio. Se escribe por feature y se **ajusta cuando se implementa** (en este proyecto las decisiones tomadas al construir se devolvieron al caso de uso). |
| `use-cases/README.md`                 | Índice de features con conteo por prioridad, y la **dependencia entre features**.                                                                                                                                                                                                      | Da el orden de implementación (un feature "requiere" otro).                                                     | Se calcula de los archivos de casos de uso.                                                                                                                                                                                  |
| `use-cases/_template.md`              | Molde de un feature.                                                                                                                                                                                                                                                                   | Que todos los features se lean igual.                                                                           | Se crea una vez.                                                                                                                                                                                                             |
| `conceptual-model/entities.md`        | Cada **entidad** en prosa, agrupada por área, con sus atributos conceptuales.                                                                                                                                                                                                          | Puente entre el lenguaje del negocio y el esquema de base de datos.                                             | Del glosario y los casos de uso: cada sustantivo recurrente es candidato a entidad.                                                                                                                                          |
| `conceptual-model/erd.md`             | Diagrama entidad-relación (mermaid) con cardinalidades.                                                                                                                                                                                                                                | Ver el conjunto de un vistazo y detectar relaciones que faltan.                                                 | De `entities.md`.                                                                                                                                                                                                            |
| `conceptual-model/open-questions.md`  | Preguntas abiertas, alternativas y riesgos del modelo, **con una recomendación** para cada una.                                                                                                                                                                                        | Deja a la vista lo que aún no se decidió, en vez de decidirlo sin que nadie lo note.                            | Dudas que aparecen al modelar; se cierran al pasar al modelo relacional o al validar con el negocio.                                                                                                                         |

### 3.2 `architecture/` — decisiones técnicas

**Objetivo**: registrar **cómo** se construye, cada tema en su subcarpeta. Todas siguen la misma forma: `README.md` + `decisions.md` + archivos de detalle. El orden de lectura recomendado es el del índice (modelo de datos → seguridad → storage → frontend → estado → PWA → ADR → multi-tenant).

| Subcarpeta          | Objetivo                                                                                                                       | Archivos                                                                                                                                                                                                                                | De dónde sale                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adr/`              | **Decisiones arquitectónicas** que afectan a varios temas o cambian el stack: contexto, decisión, alternativas, consecuencias. | `README.md` (índice con estado y fecha), `_template.md`, `ADR-NNN-<tema>.md` (uno por decisión).                                                                                                                                        | Se escribe **en el momento de decidir**: elegir framework, backend, multi-tenant, una dependencia nueva. Una decisión que cambia no se borra: se marca `superseded` y se crea otra. |
| `data-model/`       | Esquema relacional: es la fuente de verdad de las migraciones y de los tipos del frontend.                                     | `README.md` (convenciones y resumen de tablas), `decisions.md` (`D-T-NN`), `tables/` (DDL por grupo de tablas), `triggers.md`.                                                                                                          | Del modelo conceptual: cada entidad pasa a tabla, con tipos, constraints e índices. Los grupos de `tables/` repiten los de `entities.md`.                                           |
| `security/`         | Cómo se protege el dato **en la base de datos**: la defensa principal; el frontend solo oculta botones.                        | `README.md` (principios), `decisions.md` (`D-RLS-NN`), `helpers.md` (funciones `SECURITY DEFINER`), `views.md`, `policies/` (un archivo por grupo de tablas, **mismo agrupamiento que `tables/`** y una tabla resumen operación × rol). | De la **matriz de `actors-and-roles.md`** y de las tablas. Se prueba con tests de integración.                                                                                      |
| `storage/`          | Archivos binarios: buckets, estructura de paths, políticas, flujo de subida, límites.                                          | `README.md`, `decisions.md` (`D-ST-NN`), `buckets.md`, `paths.md`, `policies.md`, `upload-flow.md`, `limits.md`.                                                                                                                        | De los casos de uso que manejan archivos (fotos, logo) y de los límites del proveedor.                                                                                              |
| `multi-tenant/`     | Aislamiento entre inquilinos, configuración por inquilino, alta e invitación de usuarios y por qué (no) se usan feature flags. | `README.md`, `decisions.md` (`D-MT-NN`), `workshop-settings.md`, `feature-flags.md`, `workshop-onboarding.md`.                                                                                                                          | De ADR-003 (multi-tenant desde el día 1) y de los casos de uso de onboarding.                                                                                                       |
| `frontend/`         | Cómo se organiza la aplicación: capas de carpetas, qué es una página y qué un componente, flujo de datos, errores, rutas.      | `README.md`, `decisions.md` (`D-FE-NN`), `structure.md`, `feature-template.md`, `data-flow.md`, `error-handling.md`, `routing.md`.                                                                                                      | Del framework elegido (ADR) y de las reglas de dependencia entre capas. Se afina con el primer feature real.                                                                        |
| `state-management/` | Qué tipo de estado va dónde (local, servidor, global…), y **cuándo no** usar cada herramienta.                                 | `README.md`, `decisions.md` (`D-STATE-NN`), `taxonomy.md`, `decision-tree.md`, `antipatterns.md`, `examples.md`.                                                                                                                        | Del ADR de estado y de los errores que se quiere evitar.                                                                                                                            |
| `pwa-offline/`      | Instalación, service worker, red, actualización y límites de la plataforma móvil.                                              | `README.md`, `decisions.md` (`D-PWA-NN`), `service-worker.md`, `manifest.md`, `network.md`, `updates.md`, `install.md`, `ios-limitations.md`.                                                                                           | Del ADR de PWA/online-first y de la documentación de las plataformas.                                                                                                               |

### 3.3 `design/` — sistema de diseño

**Objetivo**: que toda la interfaz se vea y se comporte igual sin decidirlo cada vez.

| Archivo                                               | Qué contiene                                                                                                   | De dónde sale                                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `README.md`                                           | Principios, orden de lectura, qué no incluye.                                                                  | —                                                                                      |
| `decisions.md`                                        | `D-DS-NN`: librería de estilos, paleta, tipografía, iconos, modo oscuro, reglas de producto que afectan la UI. | Decisiones del equipo; se registran al tomarlas.                                       |
| `tokens.md`                                           | Colores, tipografía, espaciado, radios, sombras y modo oscuro como variables.                                  | Marca del producto y las decisiones anteriores.                                        |
| `tailwind-config.md`                                  | Cómo se traducen los tokens a la herramienta de estilos.                                                       | De los tokens.                                                                         |
| `components.md`                                       | **Catálogo de componentes base**: propósito, entradas, comportamiento y ejemplo de cada uno.                   | Se escribe antes de construirlo y se **actualiza con lo que realmente se implementó**. |
| `responsive.md`, `accessibility.md`, `conventions.md` | Breakpoints, accesibilidad mínima (contraste, foco, teclado), convenciones de clases.                          | Estándares (WCAG) y decisiones del equipo.                                             |

### 3.4 `testing/` — estrategia de pruebas

**Objetivo**: acordar qué se prueba, con qué y con qué cobertura, antes de escribir la primera prueba.

| Archivo                                                 | Qué contiene                                                                 | De dónde sale                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `decisions.md`                                          | `D-TEST-NN`: niveles de prueba, runner, cobertura mínima por tipo de código. | Equipo.                                                                         |
| `strategy.md`                                           | Qué se prueba y qué no, pirámide, prioridades.                               | De los riesgos: la seguridad por inquilino y las reglas de negocio van primero. |
| `tools.md`                                              | Herramientas y entorno (runner, navegador, base de datos local).             | Del stack.                                                                      |
| `unit-tests.md`, `integration-tests.md`, `e2e-tests.md` | Cómo escribir cada nivel, con ejemplos.                                      | Del stack y de los casos de uso (la tabla de testing de cada feature).          |
| `conventions.md`                                        | Nombres, ubicación de archivos y de mocks.                                   | Equipo.                                                                         |

### 3.5 `git-workflow.md` — proceso

**Objetivo**: un solo documento con las reglas del repositorio: tipos de rama, commits convencionales, historial lineal, hooks, CI, protección de la rama principal y, desde ADR-016, cómo se instalan y actualizan dependencias. Se escribe **antes** del primer commit y se amplía cuando el proceso aprende algo (un fallo de CI, una regla nueva).

---

## 4. Cómo se construyó (el orden importa)

El orden en que se escribió es parte del método, porque cada capa se apoya en la anterior:

| Fase | Entregable                                                                       | Se apoya en                         |
| ---- | -------------------------------------------------------------------------------- | ----------------------------------- |
| 1    | Glosario, actores y roles, estados, reglas                                       | Entrevistas con el negocio          |
| 2    | Casos de uso por feature                                                         | Fase 1                              |
| 3    | Modelo conceptual (entidades, ERD, preguntas)                                    | Fases 1 y 2                         |
| 4    | ADR del stack (framework, backend, multi-tenant…)                                | Restricciones del proyecto          |
| 5    | Modelo relacional + triggers                                                     | Modelo conceptual y ADR             |
| 6    | Seguridad (RLS), storage, multi-tenant                                           | Modelo relacional y matriz de roles |
| 7    | Frontend, estado, PWA                                                            | ADR y casos de uso                  |
| 8    | Design system, testing, git-workflow                                             | Stack elegido                       |
| 9    | **Implementación feature por feature**, con ajustes que vuelven a los documentos | Todo lo anterior                    |

La fase 9 cierra el círculo: lo que se aprende al construir (una validación que no estaba prevista, un límite de la base de datos) se **devuelve** a los casos de uso, al catálogo de componentes y a los README de cada feature. Sin eso, la documentación envejece y deja de ser fuente de verdad.

---

## 5. Cómo replicarla en otro proyecto multi-tenant

### 5.1 Qué se copia tal cual y qué no

Piensa en tres categorías:

**A. Se copia tal cual** (el método; no depende del negocio ni del stack)

| Elemento                                                                                                                                                                                  | Nota                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| El **árbol de carpetas** y la separación qué / cómo / diseño / testing / proceso                                                                                                          | Vacío de contenido, con los README.                                                 |
| Los **seis mecanismos** (§1.4): README con cabecera, `decisions.md`, IDs estables, "No incluye", plantillas, versión y fecha                                                              | Es lo que hace navegable el conjunto.                                               |
| Las plantillas `_template.md` de casos de uso y de ADR                                                                                                                                    | Se copian sin cambios.                                                              |
| La **jerarquía** "el dominio manda" y el orden de trabajo (§4)                                                                                                                            | Es política, no contenido.                                                          |
| `git-workflow.md`: ramas cortas, commits convencionales, historial lineal, PR integrado con rebase, hooks, CI                                                                             | Cambian solo nombres de ramas de ejemplo y de herramientas concretas.               |
| `testing/`: pirámide de 3 niveles, cobertura por tipo de código, "RLS/aislamiento se prueba en la base de datos"                                                                          | Aplica a cualquier SaaS con aislamiento por inquilino.                              |
| `state-management/`: taxonomía de estado, árbol de decisión, antipatrones                                                                                                                 | Vale en cualquier app Angular/signals; en otro framework se traduce el vocabulario. |
| Los **principios** de multi-tenant: columna de inquilino en toda tabla de negocio, aislamiento en la base de datos, "denegar por defecto", políticas por operación, helpers reutilizables | Son el patrón, no el dato.                                                          |
| Las reglas duras de `CLAUDE.md` (documentar antes, ADR para dependencias, versiones exactas, sin commits directos a `main`)                                                               | Se pegan y se ajustan a las convenciones del equipo.                                |
| La idea de un **README por feature** en el código                                                                                                                                         | Mismo molde en cualquier proyecto.                                                  |

**B. Se copia la forma, pero el contenido se reescribe** (es la parte que pertenece a este proyecto)

| Elemento                                                  | Qué es de este proyecto                                                | Cómo se reemplaza en el nuevo                                                                                                                                                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `glossary.md`                                             | Todos los términos (orden de trabajo, placa, garantía…).               | Entrevistas con el nuevo negocio; empezar con 10–15 términos y crecer. Se conserva el formato (término, definición, y cuándo **no** usarlo).                                                  |
| `actors-and-roles.md`                                     | Owner / advisor / mechanic y la matriz.                                | Listar quién usa el sistema y las acciones principales; construir la matriz acción × rol. Marcar los actores que **no** son usuarios.                                                         |
| `state-machine.md`                                        | Estados y transiciones de la orden de trabajo.                         | Identificar la entidad que atraviesa un flujo (pedido, reserva, ticket…) y dibujar su ciclo de vida con transiciones numeradas. Si el negocio no tiene flujo de estados, el archivo se omite. |
| `business-rules.md`                                       | `RT-01…` específicas del taller.                                       | Reglas que atraviesan features del nuevo negocio, con su implementación y su test. Se conserva el formato.                                                                                    |
| `use-cases/01…15`                                         | Los 15 features y sus casos.                                           | Un archivo por feature del nuevo producto, con la plantilla. **Solo suelen coincidir** `01-auth` y `02-onboarding` (ver C).                                                                   |
| `conceptual-model/`                                       | Las 20 entidades.                                                      | Se rehace desde el glosario y los casos de uso.                                                                                                                                               |
| `data-model/tables/` y `security/policies/`               | 27 tablas y sus policies, agrupadas por área del taller.               | Se rehacen con los grupos del nuevo dominio. **Mantener el mismo agrupamiento y numeración en ambas carpetas** y la tabla resumen de policies.                                                |
| `storage/` (buckets `photos` y `logos`)                   | Qué archivos maneja este negocio.                                      | Solo si el nuevo proyecto sube archivos; los buckets y paths se rediseñan, el patrón "primer segmento del path = inquilino" se conserva.                                                      |
| `pwa-offline/`                                            | Decisión online-first con tolerancia a fallos.                         | Si el producto no es una PWA móvil, se omite; si lo es, se decide primero la estrategia (ADR) y luego se rehacen los archivos.                                                                |
| `design/tokens.md`, paleta, `components.md` (contenido)   | Marca y componentes de este producto.                                  | Nueva marca; el **catálogo** se conserva como forma (propósito, entradas, comportamiento, ejemplo).                                                                                           |
| Los ADR existentes y los `decisions.md` con su numeración | Decisiones concretas (Angular 21, Supabase, bucket público de logos…). | Se reescriben con las decisiones del nuevo proyecto. Los IDs **empiezan de nuevo**; no se arrastran los del anterior.                                                                         |

**C. Plantillas de contenido que sí se reutilizan en cualquier SaaS multi-tenant** (se adaptan nombres, no estructura)

| Contenido                                                                                           | Adaptación                                                                                                     |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `01-auth` (iniciar sesión, registro, recuperar contraseña)                                          | Se mantiene casi igual; cambia el proveedor de identidad si no es el mismo.                                    |
| `02-onboarding` (crear el inquilino, invitar usuarios, configuración, logo)                         | Cambia el nombre del inquilino ("taller" → "clínica", "tienda"…) y los roles invitables.                       |
| `15-administración del SaaS` (listado y métricas de inquilinos, suspensión, baja, planes y límites) | Se conserva el esquema; cambia el nombre del inquilino y qué se mide.                                          |
| `multi-tenant/` (aislamiento, configuración por inquilino, onboarding, sin feature flags en MVP)    | Cambia el vocabulario (`workshop_id` → `tenant_id`); la decisión de "columna por fila" se revisa en el ADR.    |
| `security/` (principios, helpers de pertenencia y rol, vistas para ocultar columnas)                | Los helpers "a qué inquilinos pertenece el usuario" y "con qué rol" son iguales en cualquier proyecto con RLS. |

### 5.2 Qué depende del stack

Esta documentación asume **Angular + Supabase (PostgreSQL con RLS)**. Si el nuevo proyecto usa otro stack:

| Carpeta / tema                              | Qué hacer                                                                                                                                                                                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security/` (RLS)                           | Si no hay PostgreSQL con RLS, **se conserva la carpeta** pero cambia el contenido: autorización en el servidor, filtros obligatorios por inquilino, o esquema por inquilino. Los principios (denegar por defecto, no confiar en el cliente, probar el aislamiento) siguen valiendo. |
| `data-model/`                               | Con otra base de datos cambian los tipos y el DDL; las convenciones (PK, auditoría, soft delete, columna de inquilino) se mantienen como decisiones.                                                                                                                                |
| `storage/`                                  | Con otro proveedor, cambian buckets y políticas; el patrón de paths y las reglas (UUID como nombre, lista blanca de tipos, compresión) se mantienen.                                                                                                                                |
| `frontend/`, `state-management/`, `design/` | En otro framework, cambian los nombres (signals, NgRx, `resource`); la **idea** (capas, componentes presentacionales vs. páginas, estado local por defecto) se traslada.                                                                                                            |
| `pwa-offline/`                              | Solo si el producto es una aplicación instalable.                                                                                                                                                                                                                                   |

### 5.3 Pasos para empezar un proyecto nuevo

1. **Copiar el esqueleto vacío**: carpetas, README de cada una, plantillas (`_template.md`) y `git-workflow.md`. Quitar números y nombres propios (versiones, conteos, "taller").
2. **Decidir los prefijos de IDs** del nuevo proyecto y dejarlos en `domain/README.md` (en este: `UC-XXX-NN`, `RT-NN`, `T-NN`, `ADR-NNN`). Cambian los dos o tres que no apliquen.
3. **Escribir el glosario** a partir de las primeras entrevistas. Es el primer documento y se amplía durante todo el proyecto.
4. **Actores y matriz de permisos** y, si hay un flujo, **la máquina de estados**.
5. **Casos de uso**: partir de `auth` y `onboarding` (reutilizables), y de ahí el resto por feature. Marcar prioridad MVP / Fase 2 / Fase 3 en cada caso.
6. **Modelo conceptual**, con `open-questions.md` para lo no resuelto.
7. **ADR del stack y del multi-tenant** antes de tocar el modelo relacional.
8. **Modelo relacional → seguridad → storage** en ese orden (la seguridad sale de la matriz y las tablas).
9. **Frontend, estado, design y testing**, ajustados al stack.
10. **Reglas duras y `CLAUDE.md`**, y recién ahí el primer feature, con su README, y con la costumbre de **devolver a los documentos lo que se aprenda**.

> Un proyecto pequeño no necesita las 100+ páginas. Lo mínimo útil es: glosario, actores y permisos, casos de uso del MVP, modelo de datos, políticas de seguridad, un ADR del stack y `git-workflow.md`. El resto se agrega cuando haga falta; lo importante es respetar la forma (§1.4) desde el primer archivo.

### 5.4 De dónde sale la información (resumen)

| Tipo de información                          | Fuente                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Términos, actores, flujo, reglas, casos      | **Personas del negocio**: entrevistas, observación del proceso real, casos que ya ocurrieron.  |
| Entidades y esquema                          | Se **derivan** del glosario y los casos de uso (no se inventan aparte).                        |
| Policies de seguridad                        | Se derivan de la **matriz de permisos** y de las tablas.                                       |
| Decisiones técnicas (ADR, `decisions.md`)    | El **equipo**, al decidir; se escriben en el momento, con las alternativas que se descartaron. |
| Límites y datos de plataforma (storage, PWA) | Documentación de los proveedores y plataformas, anotando la versión consultada.                |
| Catálogo de componentes, convenciones        | Primero el diseño previsto; luego se **corrige con lo implementado**.                          |
| Estado de cada feature                       | El **README del feature** y los README de cada carpeta (tabla "Estado actual").                |

---

## 6. Cómo mantenerla viva

- **Un cambio de comportamiento** se escribe primero en el caso de uso y recién después en el código. Un cambio de esquema, primero en `data-model/` y luego en la migración.
- **Los IDs no se reutilizan.** Una decisión cambiada no se borra: su ADR pasa a `superseded` y se crea otro.
- **Si hay conflicto**, gana el dominio sobre la arquitectura, y la arquitectura sobre el código.
- **Cada README tiene su tabla de estado**; se actualiza al cerrar un hito, junto con la versión y la fecha.
- **No duplicar:** si algo ya está en otro documento, se enlaza. Las cifras que se repiten (número de tablas, de casos de uso) son las que más se desactualizan; conviene tenerlas en un solo lugar.
- **Lo que se aprende al implementar vuelve a los documentos** (casos de uso, catálogo de componentes, README de cada feature). Es la costumbre que más separa una documentación viva de una que se abandona.

---

## Referencias

- [Índice raíz de la documentación](./README.md)
- [Dominio](./domain/README.md) · [Arquitectura](./architecture/README.md) · [Diseño](./design/README.md) · [Testing](./testing/README.md)
- [Flujo de trabajo con Git](./git-workflow.md)
- [ADR-016: versiones exactas](./architecture/adr/ADR-016-versiones-exactas.md) (ejemplo de decisión registrada con la plantilla)

---

_Guía de estructura de la documentación v1.0 — Documento vivo._
