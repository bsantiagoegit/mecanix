# Manejo de Errores

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir la estrategia de manejo de errores en tres niveles: data service, contenedor, y global.

---

## Niveles

| Nivel            | Responsabilidad                                 | Ejemplo                           |
| ---------------- | ----------------------------------------------- | --------------------------------- |
| **Data service** | Mapear errores de Supabase a errores de dominio | `23505` → `ValidationError`       |
| **Contenedor**   | Mostrar al usuario, decidir si reintentar       | `toast.error('No se pudo crear')` |
| **Global**       | Capturar errores no manejados                   | `ErrorHandler`                    |

---

## Tipos de error de dominio

```typescript
export class DataError extends Error {
  constructor(public readonly originalError: unknown) {
    super('Data access error');
    this.name = 'DataError';
  }
}

export class NotFoundError extends Error {
  constructor(
    public readonly entity: string,
    public readonly id: string,
  ) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(public readonly fields: Record<string, string>) {
    super('Validation error');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor() {
    super('Not authorized');
    this.name = 'AuthorizationError';
  }
}
```

---

## Mapeo de errores de Supabase

En cada data service:

```typescript
async create(payload: CreateCustomerDto): Promise<Customer> {
  const { data, error } = await this.supabase
    .from('customers')
    .insert(payload)
    .select()
    .single();

  if (error) {
    // Unique violation
    if (error.code === '23505') {
      throw new ValidationError({ identification: 'Ya existe' });
    }
    // Foreign key violation
    if (error.code === '23503') {
      throw new ValidationError({ workshopId: 'Taller no válido' });
    }
    // RLS violation
    if (error.code === '42501' || error.message.includes('policy')) {
      throw new AuthorizationError();
    }
    // Generic
    throw new DataError(error);
  }

  return data;
}
```

**Códigos comunes de PostgreSQL**:

| Código  | Significado            | Error de dominio     |
| ------- | ---------------------- | -------------------- |
| `23505` | Unique violation       | `ValidationError`    |
| `23503` | Foreign key violation  | `ValidationError`    |
| `23514` | CHECK violation        | `ValidationError`    |
| `42501` | Insufficient privilege | `AuthorizationError` |
| Otros   | Desconocido            | `DataError`          |

---

## Manejo en contenedores

**Patrón típico**:

```typescript
async onSubmit() {
  try {
    const created = await this.customersService.create(this.form.value);
    this.toast.success('Cliente creado');
    this.router.navigate(['/customers', created.id]);
  } catch (error) {
    if (error instanceof ValidationError) {
      this.applyFieldErrors(error.fields);
    } else if (error instanceof AuthorizationError) {
      this.toast.error('No tienes permiso para esta acción');
    } else {
      this.toast.error('No se pudo crear el cliente');
      console.error(error);
    }
  }
}
```

**Reglas**:

- Siempre capturar errores del data service.
- Nunca propagar errores crudos a la UI.
- Usar `ValidationError` para errores de formulario.
- Usar `toast` para errores de red o permisos.

---

## Manejo global

### `ErrorHandler` de Angular

```typescript
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);

  handleError(error: unknown): void {
    console.error('Unhandled error:', error);
    this.toast.error('Ocurrió un error inesperado');
  }
}
```

**Registro** en `app.config.ts`:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // ...
  ],
};
```

### Interceptor HTTP

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        inject(AuthStore).logout();
      }
      return throwError(() => error);
    }),
  );
};
```

**Nota**: Supabase JS no usa `HttpClient`, así que este interceptor solo aplica a llamadas HTTP que no sean de Supabase (ej: Edge Functions).

---

## Mensajes al usuario

**Reglas**:

- **Éxito**: toast con mensaje corto (`"Cliente creado"`).
- **Validación**: mensaje inline en el campo del formulario.
- **Error de red**: toast genérico (`"No se pudo conectar"`).
- **Error de permisos**: toast con mensaje claro (`"No tienes permiso"`).
- **Error inesperado**: toast genérico (`"Ocurrió un error inesperado"`).

**Idioma**: todos los mensajes en español.

---

## Referencias

- [README de frontend](./README.md)
- [Decisiones transversales](./decisions.md)
- [Flujos de datos](./data-flow.md)

---

_Manejo de Errores v1.0_
