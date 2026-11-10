import { FormControl } from '@angular/forms';
import {
  checkEcuadorCedula,
  ecuadorCedulaValidator,
  isValidEcuadorCedula,
} from './ecuador-cedula.validator';

describe('checkEcuadorCedula', () => {
  it.each([
    '1700000001',
    '1710034065',
    '0926687856',
    '1713175071',
    '0100000009',
    '1712345675',
    '2400000002',
    '3000000004',
  ])('accepts the valid cédula "%s"', (value) => {
    expect(checkEcuadorCedula(value)).toBeNull();
    expect(isValidEcuadorCedula(value)).toBe(true);
  });

  it.each(['17100340a5', '171 003406', '1710-34065', '+171003406', 'abcdefghij'])(
    'rejects "%s" for its characters',
    (value) => {
      expect(checkEcuadorCedula(value)).toBe('format');
    },
  );

  it.each(['171003406', '17100340655', '1', '17'])('rejects "%s" for its length', (value) => {
    expect(checkEcuadorCedula(value)).toBe('length');
  });

  describe('province code', () => {
    it.each(['0010034065', '2510034065', '2910034065', '3110034065', '9910034065'])(
      'rejects "%s": provinces are 01 to 24, or 30',
      (value) => {
        expect(checkEcuadorCedula(value)).toBe('province');
      },
    );

    it.each(['01', '12', '24', '30'])('accepts the province %s', (province) => {
      // Se arma una cédula con ese código y el verificador correcto.
      const base = `${province}0000000`;
      const sum = [...base].reduce((total, digit, index) => {
        const product = Number(digit) * [2, 1, 2, 1, 2, 1, 2, 1, 2][index];
        return total + (product > 9 ? product - 9 : product);
      }, 0);
      expect(checkEcuadorCedula(`${base}${(10 - (sum % 10)) % 10}`)).toBeNull();
    });
  });

  describe('third digit', () => {
    it.each(['1760000001', '1769999999', '1790034065'])(
      'rejects "%s": for a person it is 0 to 5',
      (value) => {
        expect(checkEcuadorCedula(value)).toBe('third-digit');
      },
    );
  });

  describe('check digit (Módulo 10)', () => {
    it.each(['1710034066', '1710034060', '0926687857', '1700000002', '0100000001', '1712345678'])(
      'rejects "%s": the check digit does not match',
      (value) => {
        expect(checkEcuadorCedula(value)).toBe('check-digit');
      },
    );

    it('changing any digit of a valid cédula makes it invalid', () => {
      const valid = '1710034065';
      for (let position = 3; position < 9; position++) {
        const digit = Number(valid[position]);
        const changed = `${valid.slice(0, position)}${(digit + 1) % 10}${valid.slice(position + 1)}`;
        expect(checkEcuadorCedula(changed)).toBe('check-digit');
      }
    });

    it('subtracts 9 from the products above 9', () => {
      // 1x2=2, 7x1=7, 1x2=2, 5x1=5, 5x2=10->1, 5x1=5, 5x2=10->1, 5x1=5, 0x2=0: suma 28 -> verificador 2.
      expect(checkEcuadorCedula('1715555500')).toBe('check-digit');
      expect(checkEcuadorCedula('1715555502')).toBeNull();
    });

    it('accepts a check digit of 0 when the sum is a multiple of 10', () => {
      // 0x2, 5x1, 0x2, 5x1: suma 10 -> verificador (10 - 0) % 10 = 0.
      expect(checkEcuadorCedula('0505000000')).toBeNull();
      expect(checkEcuadorCedula('0505000001')).toBe('check-digit');
    });
  });

  it('checks in order: characters, length, province, third digit, check digit', () => {
    expect(checkEcuadorCedula('99x')).toBe('format');
    expect(checkEcuadorCedula('99')).toBe('length');
    expect(checkEcuadorCedula('9910034065')).toBe('province');
    expect(checkEcuadorCedula('1760034065')).toBe('third-digit');
    expect(checkEcuadorCedula('1710034066')).toBe('check-digit');
  });
});

describe('ecuadorCedulaValidator', () => {
  it('is valid for an empty value: combine it with required', () => {
    for (const value of ['', null, undefined]) {
      expect(ecuadorCedulaValidator(new FormControl(value))).toBeNull();
    }
  });

  it('is valid for a correct cédula', () => {
    expect(ecuadorCedulaValidator(new FormControl('1710034065'))).toBeNull();
  });

  it.each([
    ['171003406', 'length'],
    ['1710034066', 'check-digit'],
    ['9910034065', 'province'],
    ['1760034065', 'third-digit'],
    ['17100x4065', 'format'],
  ])('reports "%s" with the problem "%s"', (value, problem) => {
    expect(ecuadorCedulaValidator(new FormControl(value))).toEqual({ cedula: problem });
  });
});
