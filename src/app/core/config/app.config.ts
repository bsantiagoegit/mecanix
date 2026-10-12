/**
 * Configuración global de la app (constantes de negocio transversales).
 * No confundir con app/app.config.ts (ApplicationConfig de Angular).
 */
export const APP_CONFIG = {
  defaultCapacity: 4,
  defaultMinIntakePhotos: 4,
  defaultQuoteExpirationDays: 7,
  defaultWarrantyDays: 14,
  defaultCurrency: 'USD',
  defaultTimezone: 'America/Guayaquil',
  maxPhotosPerUpload: 20,
  maxPhotoSizeMb: 5,
} as const;
