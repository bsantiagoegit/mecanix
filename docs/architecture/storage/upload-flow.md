# Flujo de Upload y Descarga

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Definir el flujo completo de subida y descarga de fotos desde el cliente Angular.

---

## Flujo de upload de fotos

```
1. Usuario toca "Tomar foto" o "Subir desde galería"
   ↓
2. Cliente obtiene el archivo (File o Blob)
   ↓
3. Cliente valida MIME type y tamaño
   ↓
4. Cliente comprime y redimensiona (browser-image-compression)
   ↓
5. Si es HEIC, convierte a JPEG (heic2any)
   ↓
6. Cliente genera UUID v4 para el nombre del archivo
   ↓
7. Cliente construye el path: {workshop_id}/orders/{work_order_id}/{uuid}.{ext}
   ↓
8. Cliente sube a Storage: supabase.storage.from('photos').upload(path, blob)
   ↓
9. Cliente inserta fila en photos con metadata
   ↓
10. Si el INSERT falla, cliente elimina el archivo subido (rollback manual)
```

**Nota sobre el paso 10**: no hay transacción entre Storage y PostgreSQL. Si el INSERT falla, hay un archivo huérfano. Se limpia manualmente en MVP; en Fase 2 con cron.

---

## Flujo de generación y compartición de PDFs

```
1. Usuario toca "Generar informe inicial" o "Generar informe final"
   ↓
2. Cliente consulta los datos necesarios desde PostgreSQL
   ↓
3. Cliente genera el HTML con los datos
   ↓
4. Cliente convierte HTML a PDF (html2canvas + jsPDF)
   ↓
5. Cliente muestra opciones: Descargar / Compartir por WhatsApp / Compartir por email
   ↓
6. Cliente ejecuta la acción elegida
   ↓
7. PDF se descarta (no se sube a Storage)
```

**Razón**: los PDFs son regenerables. No se almacenan en MVP (D-ST-13).

---

## Parámetros de compresión

| Parámetro         | Valor                    |
| ----------------- | ------------------------ |
| Resolución máxima | 1920 px (lado más largo) |
| Calidad           | 0.8                      |
| Formato           | WebP (fallback JPEG)     |
| Tamaño objetivo   | ≤ 500 KB                 |

**Librerías**:

- `browser-image-compression` — compresión y resize.
- `heic2any` — conversión HEIC → JPEG.
- `uuid` — generación de UUID v4.
- `html2canvas` + `jsPDF` — generación de PDFs.

---

## Flujo de descarga

```
1. Cliente necesita mostrar una foto
   ↓
2. Cliente tiene el storage_path (desde la tabla photos)
   ↓
3. Cliente llama: supabase.storage.from('photos').createSignedUrl(path, 3600)
   ↓
4. Supabase valida RLS sobre storage.objects
   ↓
5. Supabase devuelve URL firmada con expiración de 1 hora
   ↓
6. Cliente usa la URL en <img src="...">
```

**Cache**: la URL firmada cambia en cada llamada. El cliente cachea el resultado en memoria por sesión (Map `path → signedUrl`).

**CDN**: Supabase sirve las URLs firmadas vía su CDN. No hay configuración adicional.

---

## Manejo de errores

| Error                   | Causa                               | Acción                        |
| ----------------------- | ----------------------------------- | ----------------------------- |
| `MIME type not allowed` | Archivo no es JPEG/PNG/WebP         | Mostrar error al usuario      |
| `File too large`        | Archivo supera el límite del bucket | Reintentar con más compresión |
| `RLS policy violation`  | Usuario no pertenece al taller      | Error de autenticación        |
| `Network error`         | Conexión interrumpida               | Reintentar con backoff        |
| `INSERT failed`         | Error en la tabla `photos`          | Borrar el archivo subido      |

---

## Referencias

- [README de storage](./README.md)
- [Decisiones transversales](./decisions.md)
- [Paths](./paths.md)
- [Policies](./policies.md)

---

_Flujo de Upload y Descarga v1.1_
