import { prefillFromSearch } from './customer-prefill';

describe('prefillFromSearch', () => {
  it.each(['0987654321', '+593 98 765 4321', '(02) 255-1234'])('puts "%s" in the phone', (text) => {
    expect(prefillFromSearch(text)).toEqual({ phone: text });
  });

  it('puts a single word in the first name', () => {
    expect(prefillFromSearch('Ana')).toEqual({ firstName: 'Ana' });
  });

  it('splits several words into first name and last name', () => {
    expect(prefillFromSearch('ana maría pérez')).toEqual({
      firstName: 'ana',
      lastName: 'maría pérez',
    });
  });

  it('trims the text and ignores extra spaces', () => {
    expect(prefillFromSearch('  ana   pérez ')).toEqual({ firstName: 'ana', lastName: 'pérez' });
  });

  it.each(['', '   ', 'AB123X', '12', 'ana 12'])('does not guess for "%s"', (text) => {
    expect(prefillFromSearch(text)).toEqual({});
  });
});
