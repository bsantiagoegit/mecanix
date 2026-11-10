import { CustomerInput, isSameInput, normalizeInput } from './customer.model';

const raw = {
  firstName: '  Ana ',
  lastName: ' Pérez  ',
  phone: ' 0987654321 ',
  email: '   ',
  identification: '  ab123x ',
  address: '',
};

describe('normalizeInput', () => {
  it('trims the fields, turns empty optionals into null and uppercases the identification', () => {
    expect(normalizeInput(raw)).toEqual({
      firstName: 'Ana',
      lastName: 'Pérez',
      phone: '0987654321',
      email: null,
      identification: 'AB123X',
      address: null,
    });
  });

  it('keeps the optional values that have text', () => {
    const input = normalizeInput({ ...raw, email: ' ana@example.com ', address: ' Calle 1 ' });
    expect(input.email).toBe('ana@example.com');
    expect(input.address).toBe('Calle 1');
  });
});

describe('isSameInput', () => {
  const base: CustomerInput = {
    firstName: 'Ana',
    lastName: 'Pérez',
    phone: '0987654321',
    email: null,
    identification: 'AB123X',
    address: null,
  };

  it('is true for the same data', () => {
    expect(isSameInput(base, { ...base })).toBe(true);
  });

  it.each([
    ['firstName', 'Luisa'],
    ['lastName', 'Gómez'],
    ['phone', '0981112233'],
    ['email', 'a@x.com'],
    ['identification', 'ZZ9'],
    ['address', 'Calle 1'],
  ] as const)('is false when %s changes', (field, value) => {
    expect(isSameInput(base, { ...base, [field]: value })).toBe(false);
  });
});
