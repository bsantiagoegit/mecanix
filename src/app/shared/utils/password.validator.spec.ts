import { FormControl, FormGroup } from '@angular/forms';
import {
  PASSWORD_MIN_LENGTH,
  checkPassword,
  passwordErrorMessage,
  passwordValidator,
  passwordsMatchValidator,
} from './password.validator';

describe('checkPassword', () => {
  it.each([
    ['Abcdef12', []],
    ['Clave2026', []],
    ['ÁrbolGrande9', []],
    ['abcdefg1', ['upper']],
    ['ABCDEFG1', ['lower']],
    ['Abcdefgh', ['digit']],
    ['Abc1', ['length']],
    ['abc', ['length', 'upper', 'digit']],
    ['', ['length', 'upper', 'lower', 'digit']],
    ['12345678', ['upper', 'lower']],
  ])('"%s" fails %j', (value, missing) => {
    expect(checkPassword(value)).toEqual(missing);
  });

  it('treats null and undefined like an empty text', () => {
    expect(checkPassword(null)).toHaveLength(4);
    expect(checkPassword(undefined)).toHaveLength(4);
  });

  it('requires exactly the minimum length', () => {
    expect(checkPassword('Abcdef1')).toContain('length');
    expect(checkPassword('Abcdef12')).not.toContain('length');
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });
});

describe('passwordValidator', () => {
  it('accepts a valid password and an empty field (required handles it)', () => {
    expect(passwordValidator(new FormControl('Clave2026'))).toBeNull();
    expect(passwordValidator(new FormControl(''))).toBeNull();
    expect(passwordValidator(new FormControl(null))).toBeNull();
  });

  it('reports the missing rules', () => {
    expect(passwordValidator(new FormControl('clave'))).toEqual({
      password: { missing: ['length', 'upper', 'digit'] },
    });
  });
});

describe('passwordErrorMessage', () => {
  it.each([
    [['length', 'upper'], 'Mínimo 8 caracteres'],
    [['upper'], 'Falta una letra mayúscula'],
    [['upper', 'digit'], 'Falta una letra mayúscula y un número'],
    [['upper', 'lower', 'digit'], 'Falta una letra mayúscula, una letra minúscula y un número'],
  ] as const)('%j → %s', (missing, text) => {
    expect(passwordErrorMessage(missing)).toBe(text);
  });
});

describe('passwordsMatchValidator', () => {
  const group = (password: string, confirmPassword: string) =>
    new FormGroup({
      password: new FormControl(password),
      confirmPassword: new FormControl(confirmPassword),
    });

  it('passes when both are equal', () => {
    expect(passwordsMatchValidator(group('Clave2026', 'Clave2026'))).toBeNull();
  });
  it('fails when they differ', () => {
    expect(passwordsMatchValidator(group('Clave2026', 'Clave2027'))).toEqual({
      passwordMismatch: true,
    });
  });
});
