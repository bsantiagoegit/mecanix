import { FormControl } from '@angular/forms';
import {
  checkEcuadorMobile,
  ecuadorMobileValidator,
  isValidEcuadorMobile,
} from './ecuador-phone.validator';

describe('checkEcuadorMobile', () => {
  it.each(['0987654321', '0991000001', '0900000000', '0999999999'])('accepts "%s"', (value) => {
    expect(checkEcuadorMobile(value)).toBeNull();
    expect(isValidEcuadorMobile(value)).toBe(true);
  });

  it.each([
    ['098 765 4321', 'format'],
    ['098-765-4321', 'format'],
    ['+593987654321', 'format'],
    ['(02)2551234', 'format'],
    ['098765432a', 'format'],
    ['abcdefghij', 'format'],
    [' 0987654321', 'format'],
  ] as const)('rejects "%s" for its characters', (value, problem) => {
    expect(checkEcuadorMobile(value)).toBe(problem);
  });

  it.each(['098765432', '09876543210', '09', '1'])('rejects "%s" for its length', (value) => {
    expect(checkEcuadorMobile(value)).toBe('length');
  });

  it.each(['0287654321', '1987654321', '9987654321', '0887654321'])(
    'rejects "%s": a mobile starts with 09',
    (value) => {
      expect(checkEcuadorMobile(value)).toBe('prefix');
      expect(isValidEcuadorMobile(value)).toBe(false);
    },
  );

  it('checks the characters before the length', () => {
    expect(checkEcuadorMobile('09876')).toBe('length');
    expect(checkEcuadorMobile('09-76')).toBe('format');
  });
});

describe('ecuadorMobileValidator', () => {
  it('is valid for an empty value: combine it with required', () => {
    for (const value of ['', null, undefined]) {
      expect(ecuadorMobileValidator(new FormControl(value))).toBeNull();
    }
  });

  it('is valid for a mobile', () => {
    expect(ecuadorMobileValidator(new FormControl('0987654321'))).toBeNull();
  });

  it.each([
    ['0987', 'length'],
    ['0287654321', 'prefix'],
    ['09 8765432', 'format'],
  ])('reports "%s" with the problem "%s"', (value, problem) => {
    expect(ecuadorMobileValidator(new FormControl(value))).toEqual({ ecuadorMobile: problem });
  });
});
