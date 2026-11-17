import { Component, computed, input } from '@angular/core';
import { PASSWORD_RULES, checkPassword } from '../../utils/password.validator';

/**
 * Lista de lo que debe tener una contraseña, con cada regla marcada como cumplida o pendiente
 * según lo que se lleva escrito. Las reglas salen de `PASSWORD_RULES`, las mismas que valida el
 * formulario.
 */
@Component({
  selector: 'app-password-rules',
  templateUrl: './password-rules.html',
})
export class PasswordRules {
  /** Lo que se lleva escrito; vacío deja todas las reglas como pendientes. */
  readonly value = input<string | null | undefined>('');

  readonly items = computed(() => {
    const text = this.value() ?? '';
    const missing = new Set(checkPassword(text));
    return PASSWORD_RULES.map((rule) => ({
      id: rule.id,
      label: rule.label,
      met: !missing.has(rule.id),
      touched: text.length > 0,
    }));
  });
}
