import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { KeyDisplay } from './key-display';

@Component({
  imports: [KeyDisplay],
  template: `<app-key-display [keyCode]="code()" [size]="size()" />`,
})
class Host {
  readonly code = signal<string | null>('4821');
  readonly size = signal<'sm' | 'md'>('md');
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = () => el.querySelector<HTMLButtonElement>('button');
  return { fixture, host: fixture.componentInstance, el, button };
}

describe('KeyDisplay', () => {
  it('starts hidden: bullets, never the key', () => {
    const { el } = setup();
    expect(el.textContent).toContain('•••••');
    expect(el.textContent).not.toContain('4821');
    expect(el.textContent).toContain('Clave oculta');
  });

  it('reveals and hides the key with the eye button', () => {
    const { fixture, el, button } = setup();
    button()!.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('4821');
    expect(el.textContent).not.toContain('•••••');

    button()!.click();
    fixture.detectChanges();
    expect(el.textContent).not.toContain('4821');
    expect(el.textContent).toContain('•••••');
  });

  it('tells assistive technology what the button does and its state', () => {
    const { fixture, button } = setup();
    expect(button()!.getAttribute('aria-label')).toBe('Mostrar clave');
    expect(button()!.getAttribute('aria-pressed')).toBe('false');
    button()!.click();
    fixture.detectChanges();
    expect(button()!.getAttribute('aria-label')).toBe('Ocultar clave');
    expect(button()!.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows nothing when there is no key', () => {
    const { fixture, host, el, button } = setup();
    host.code.set(null);
    fixture.detectChanges();
    expect(button()).toBeNull();
    expect(el.textContent?.trim()).toBe('');
  });

  it('draws the key and eye icons', () => {
    const { el } = setup();
    expect(el.querySelectorAll('app-icon svg').length).toBe(2);
  });

  it('uses smaller text and icons in the sm size', () => {
    const { fixture, host, el } = setup();
    host.size.set('sm');
    fixture.detectChanges();
    expect(el.querySelector('span')?.className).toContain('text-xs');
    expect(el.querySelector('svg')?.getAttribute('width')).toBe('14');
  });
});
