[← Índice de casos de uso](../use-cases.md)

# Feature 2: Onboarding de Taller

| ID       | Caso de uso                                                                                     | Actor            | Prioridad |
| -------- | ----------------------------------------------------------------------------------------------- | ---------------- | --------- |
| UC-WS-01 | Crear taller manualmente (admin del SaaS, para casos especiales)                                | Tú (admin SaaS)  | Fase 2    |
| UC-WS-02 | Configurar taller (nombre, dirección, logo, capacidad, fotos mínimas, expiración de cotización) | Owner            | **MVP**   |
| UC-WS-03 | Invitar usuario a taller (nombre, correo, teléfono y rol)                                       | Owner            | **MVP**   |
| UC-WS-04 | Aceptar invitación y acceder a la app                                                           | Usuario invitado | **MVP**   |
| UC-WS-05 | Asignar o cambiar el rol de un usuario del taller                                               | Owner            | **MVP**   |
| UC-WS-06 | Desactivar usuario de taller                                                                    | Owner            | Fase 2    |
| UC-WS-07 | Reactivar usuario de taller                                                                     | Owner            | Fase 2    |
| UC-WS-08 | Crear mi propio taller (onboarding self-service)                                                | Usuario nuevo    | **MVP**   |

Decisiones: [ADR-012](../../architecture/adr/ADR-012-onboarding-self-service.md) (self-service, un taller por cuenta) y [ADR-013](../../architecture/adr/ADR-013-invitaciones-edge-function.md) (invitaciones). Flujos, contratos y estados de la sesión en [`workshop-onboarding.md`](../../architecture/multi-tenant/workshop-onboarding.md).

## Reglas

- **Un taller por cuenta**: un usuario pertenece como máximo a un taller.
- **Quien crea el taller es su `owner`**, y es el único. El `owner` no se invita.
- **Solo el `owner` invita**, y solo a `advisor` o `mechanic`.
- **MVP**: se invita únicamente a correos sin cuenta.

---

## UC-WS-08: Crear mi propio taller

- **Actor**: usuario registrado (UC-AUTH-07), con el correo confirmado, sin taller.
- **Precondición**: no pertenece a ningún taller (ni activo ni con invitación pendiente).
- **Flujo principal**:
  1. El usuario inicia sesión y el sistema lo lleva a "Crea tu taller".
  2. Ingresa nombre, dirección y teléfono del taller, y opcionalmente elige el logo.
  3. El sistema crea el taller con los valores por defecto y lo asigna como `owner` activo.
  4. Si eligió un logo, el sistema lo sube y lo asocia al taller.
  5. El sistema lo lleva al dashboard.
- **Flujos alternativos**:
  - Si ya pertenece a un taller, el sistema rechaza la creación.
  - Si el logo no se puede subir, el taller se crea igual y el sistema avisa; el `owner` puede subirlo después desde la configuración (UC-WS-02).
- **Postcondición**: existe un taller y su único `owner`.

## UC-WS-02: Configurar taller

- **Actor**: `owner`. Los demás roles no ven la configuración.
- **Acceso**: apartado "Configuración" en el dashboard.
- **Flujo principal**: el `owner` edita los datos del taller y guarda.
  - **Datos del taller**: nombre, dirección, teléfono y **logo** (subir, cambiar o quitar).
  - **Reglas operativas**: capacidad, mínimo de fotos de ingreso, días de expiración de cotización, días de garantía, moneda y zona horaria.
- **Logo**: se admite `jpeg`, `png` o `webp` de hasta 1 MB (el sistema lo redimensiona a un máximo de 512 px por lado). Al cambiarlo, el archivo anterior se elimina. Ver [ADR-014](../../architecture/adr/ADR-014-bucket-publico-logos.md).
- **Reglas**: los valores respetan las restricciones de `workshops` (por ejemplo, capacidad y fotos mínimas positivas, moneda de 3 letras). El nombre, la dirección y el teléfono son obligatorios.
- **Postcondición**: los cambios se ven en toda la app (el nombre y el logo aparecen en el encabezado).

## UC-WS-03: Invitar usuario a taller

- **Actor**: `owner`. Ningún otro rol puede invitar.
- **Flujo principal**:
  1. El `owner` abre "Equipo" → "Invitar usuario".
  2. Ingresa nombre completo, correo, teléfono y rol (`advisor` o `mechanic`).
  3. El sistema envía la invitación al correo y muestra al usuario en la lista con estado "Invitado".
- **Flujos alternativos**:
  - Si el correo ya tiene una cuenta, el sistema rechaza la invitación.
  - **Reenviar**: el `owner` puede reenviar una invitación pendiente (por ejemplo, si el enlace caducó).
  - **Cancelar**: el `owner` puede cancelar una invitación pendiente; el enlace deja de dar acceso.

## UC-WS-04: Aceptar invitación y acceder a la app

- **Actor**: usuario invitado.
- **Flujo principal**:
  1. El invitado abre el enlace del correo; se abre el navegador en la URL de la app.
  2. El sistema muestra el taller y el rol, y le pide fijar una contraseña.
  3. Al aceptar, la membresía pasa a `active` y el usuario entra a la app con su rol.
  4. La app le ofrece instalarla como PWA (en iOS, con instrucciones de "Añadir a pantalla de inicio").
- **Nota**: hasta aceptar, el usuario no tiene contraseña ni acceso.

## UC-WS-05: Asignar o cambiar el rol de un usuario

- **Actor**: `owner`.
- **Flujo principal**: al invitar se elige el rol (UC-WS-03). Después, el `owner` puede cambiar el rol de un miembro entre `advisor` y `mechanic`.
- **Regla**: el rol `owner` no se asigna ni se transfiere en el MVP.
