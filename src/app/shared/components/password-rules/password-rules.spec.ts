import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PasswordRules } from './password-rules';

@Component({ imports: [PasswordRules], template: `<app-password-rules [value]="value()" />` })
class Host {
  readonly value = signal('');
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const rows = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('li')].map((li) =>
      li.textContent!.replace(/\s+/g, ' ').replace('(', ' (').replace(/\s+/g, ' ').trim(),
    );
  return { fixture, host: fixture.componentInstance, rows };
}

describe('PasswordRules', () => {
  it('lists the four rules, all pending, while nothing is typed', () => {
    const { rows } = setup();
    expect(rows()).toEqual([
      'Al menos 8 caracteres (pendiente)',
      'Una letra mayúscula (pendiente)',
      'Una letra minúscula (pendiente)',
      'Un número (pendiente)',
    ]);
  });

  it('marks each rule as met as the password grows', () => {
    const { fixture, host, rows } = setup();
    host.value.set('abc');
    fixture.detectChanges();
    expect(rows()).toEqual([
      'Al menos 8 caracteres (pendiente)',
      'Una letra mayúscula (pendiente)',
      'Una letra minúscula (cumplida)',
      'Un número (pendiente)',
    ]);
    host.value.set('Abcdefg1');
    fixture.detectChanges();
    expect(rows().every((row) => row.endsWith('(cumplida)'))).toBe(true);
  });
});
