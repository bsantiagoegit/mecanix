import {
  Customer,
  CustomerInput,
  customerToInput,
  isSameInput,
  normalizeInput,
} from './customer.model';

const base: CustomerInput = {
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: '0987654321',
  email: 'ana@example.com',
  identification: '1710034065',
  address: 'Calle 1',
};

describe('normalizeInput', () => {
  it('trims every field', () => {
    expect(
      normalizeInput({
        firstName: '  Ana ',
        lastName: ' Pérez  ',
        phone: ' 0987654321 ',
        email: ' ana@example.com ',
        identification: ' 1710034065 ',
        address: '  Calle 1 ',
      }),
    ).toEqual(base);
  });

  it('keeps the inner spaces', () => {
    expect(normalizeInput({ ...base, firstName: 'María  del Carmen' }).firstName).toBe(
      'María  del Carmen',
    );
  });
});

describe('isSameInput', () => {
  it('is true for the same data', () => {
    expect(isSameInput(base, { ...base })).toBe(true);
  });

  it('ignores surrounding spaces, as the database does', () => {
    expect(isSameInput(base, { ...base, address: ' Calle 1  ' })).toBe(true);
  });

  it.each([
    ['firstName', 'Luisa'],
    ['lastName', 'Gómez'],
    ['phone', '0981112233'],
    ['email', 'luisa@example.com'],
    ['identification', '1713175071'],
    ['address', 'Calle 2'],
  ] as const)('is false when %s changes', (field, value) => {
    expect(isSameInput(base, { ...base, [field]: value })).toBe(false);
  });
});

describe('customerToInput', () => {
  const customer: Customer = {
    id: 'c1',
    firstName: 'Ana',
    lastName: 'Pérez',
    phone: '0987654321',
    email: 'ana@example.com',
    identification: '1710034065',
    address: 'Calle 1',
  };

  it('copies the data the form asks for', () => {
    expect(customerToInput(customer)).toEqual(base);
  });

  it('leaves empty the data an old customer does not have, so the form asks for it', () => {
    expect(
      customerToInput({
        ...customer,
        phone: null,
        email: null,
        identification: null,
        address: null,
      }),
    ).toEqual({ ...base, phone: '', email: '', identification: '', address: '' });
  });

  it('does not carry the id', () => {
    expect(customerToInput(customer)).not.toHaveProperty('id');
  });
});
