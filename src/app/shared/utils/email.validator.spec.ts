import { FormControl } from '@angular/forms';
import { emailValidator } from './email.validator';

const check = (value: string | null) => emailValidator(new FormControl(value));

describe('emailValidator', () => {
  it.each(['ana@example.com', 'ana+tag@mail.example.co', 'Ana@Example.COM', 'a.b-c@x.io'])(
    'accepts %s',
    (email) => expect(check(email)).toBeNull(),
  );

  it.each([
    'ana@example',
    'a@b',
    'a@x.c',
    'ana@x..com',
    'ana@@x.com',
    'ana',
    '@x.com',
    'a b@x.com',
  ])('rejects %s', (email) => expect(check(email)).toEqual({ email: true }));

  it('leaves an empty value to Validators.required', () => {
    expect(check('')).toBeNull();
    expect(check(null)).toBeNull();
  });
});
