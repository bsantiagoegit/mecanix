import {
  LucideCheck,
  LucideChevronDown,
  LucideEye,
  LucideEyeOff,
  LucideInfo,
  LucideLoaderCircle,
  LucideX,
} from '@lucide/angular';

/**
 * Los iconos que usa la app, por nombre. Es el único lugar donde se importan de Lucide: así solo
 * se empaquetan estos y `app-icon` valida el nombre al compilar.
 *
 * Para añadir uno: importarlo arriba (nombres en https://lucide.dev/icons/) y registrarlo aquí con
 * su nombre en kebab-case.
 */
export const APP_ICONS = {
  check: LucideCheck,
  'chevron-down': LucideChevronDown,
  eye: LucideEye,
  'eye-off': LucideEyeOff,
  info: LucideInfo,
  'loader-circle': LucideLoaderCircle,
  x: LucideX,
} as const;

export type AppIconName = keyof typeof APP_ICONS;
