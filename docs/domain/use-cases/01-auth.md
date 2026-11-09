[← Índice de casos de uso](../use-cases.md)

# Feature 1: Autenticación y Sesión

| ID         | Caso de uso                                      | Actor         | Prioridad |
| ---------- | ------------------------------------------------ | ------------- | --------- |
| UC-AUTH-01 | Iniciar sesión con email y password              | Todos         | **MVP**   |
| UC-AUTH-02 | Cerrar sesión                                    | Todos         | **MVP**   |
| UC-AUTH-03 | Recuperar contraseña                             | Todos         | **MVP**   |
| UC-AUTH-04 | Cambiar contraseña                               | Todos         | Fase 2    |
| UC-AUTH-05 | Iniciar sesión con Google OAuth                  | Todos         | Fase 2    |
| UC-AUTH-06 | Autenticación biométrica (Face ID / fingerprint) | Todos         | Fase 3    |
| UC-AUTH-07 | Registrarse (crear cuenta)                       | Usuario nuevo | **MVP**   |

**UC-AUTH-07**: una persona crea su cuenta con nombre completo, email y contraseña. El email debe confirmarse con el enlace que se envía al correo. La cuenta **no da acceso a ningún taller por sí sola**: quien se registra crea su propio taller (UC-WS-08) y queda como `owner`. Los asesores y mecánicos no usan este registro: entran por invitación del `owner` (UC-WS-03 / UC-WS-04).
