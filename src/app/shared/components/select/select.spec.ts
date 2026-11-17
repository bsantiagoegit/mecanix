import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Select, SelectOption } from './select';

const OPTIONS: SelectOption[] = [
  { value: 'advisor', label: 'Asesor' },
  { value: 'mechanic', label: 'Mecánico' },
  { value: 'owner', label: 'Dueño', disabled: true },
];

@Component({
  imports: [Select, ReactiveFormsModule],
  template: `
    <app-select
      label="Rol"
      [required]="required()"
      [options]="options"
      [formControl]="control"
      [error]="error()"
      [placeholder]="'Elige un rol'"
    />
    <button id="outside" type="button">fuera</button>
  `,
})
class Host {
  readonly options = OPTIONS;
  readonly control = new FormControl<string | null>('advisor');
  readonly required = signal(true);
  readonly error = signal('');
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const trigger = () => el.querySelector<HTMLButtonElement>('button[role="combobox"]')!;
  const options = () => [...el.querySelectorAll<HTMLElement>('[role="option"]')];
  const press = (key: string) => {
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, el, trigger, options, press };
}

describe('Select', () => {
  it('shows the selected option label and the placeholder when there is none', () => {
    const { fixture, host, trigger } = setup();
    expect(trigger().textContent).toContain('Asesor');
    host.control.setValue(null);
    fixture.detectChanges();
    expect(trigger().textContent).toContain('Elige un rol');
  });

  it('is a combobox with its label and required mark', () => {
    const { el, trigger } = setup();
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('label')?.textContent).toContain('Rol');
    expect(trigger().getAttribute('aria-labelledby')).toBe(el.querySelector('label')?.id);
    expect(trigger().getAttribute('aria-required')).toBe('true');
  });

  it('opens a listbox with every option and marks the selected one', () => {
    const { fixture, trigger, options } = setup();
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(options().map((o) => o.textContent?.trim())).toEqual(['Asesor', 'Mecánico', 'Dueño']);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    expect(options()[1].getAttribute('aria-selected')).toBe('false');
    expect(options()[2].getAttribute('aria-disabled')).toBe('true');
  });

  it('chooses an option with the mouse, updates the form and closes', () => {
    const { fixture, host, trigger, options } = setup();
    trigger().click();
    fixture.detectChanges();
    options()[1].click();
    fixture.detectChanges();
    expect(host.control.value).toBe('mechanic');
    expect(trigger().textContent).toContain('Mecánico');
    expect(options().length).toBe(0);
  });

  it('does not choose a disabled option', () => {
    const { fixture, host, trigger, options } = setup();
    trigger().click();
    fixture.detectChanges();
    options()[2].click();
    fixture.detectChanges();
    expect(host.control.value).toBe('advisor');
    expect(options().length).toBe(3);
  });

  it('opens with the arrow keys and moves the active option, skipping disabled ones', () => {
    const { fixture, trigger, press } = setup();
    press('ArrowDown');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    const active = () => trigger().getAttribute('aria-activedescendant');
    const first = active();
    press('ArrowDown');
    expect(active()).not.toBe(first);
    press('ArrowDown'); // «Dueño» está deshabilitado: se queda en «Mecánico»
    expect(fixture.nativeElement.querySelector(`#${active()}`).textContent).toContain('Mecánico');
    press('ArrowUp');
    expect(fixture.nativeElement.querySelector(`#${active()}`).textContent).toContain('Asesor');
  });

  it('chooses the active option with Enter', () => {
    const { host, press } = setup();
    press('ArrowDown');
    press('ArrowDown');
    press('Enter');
    expect(host.control.value).toBe('mechanic');
  });

  it('jumps with Home and End', () => {
    const { fixture, trigger, press } = setup();
    press('ArrowDown');
    press('End');
    expect(
      fixture.nativeElement.querySelector(`#${trigger().getAttribute('aria-activedescendant')}`)
        .textContent,
    ).toContain('Mecánico');
    press('Home');
    expect(
      fixture.nativeElement.querySelector(`#${trigger().getAttribute('aria-activedescendant')}`)
        .textContent,
    ).toContain('Asesor');
  });

  it('closes with Escape without letting it reach a surrounding modal', () => {
    const { fixture, trigger } = setup();
    trigger().click();
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    const stop = vi.spyOn(event, 'stopPropagation');
    trigger().dispatchEvent(event);
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(event.defaultPrevented).toBe(true);
    expect(stop).toHaveBeenCalled();
  });

  it('lets Escape through when it is closed', () => {
    const { trigger } = setup();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    trigger().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('closes with Tab and on a click outside', () => {
    const { fixture, el, trigger, press } = setup();
    trigger().click();
    fixture.detectChanges();
    press('Tab');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    trigger().click();
    fixture.detectChanges();
    el.querySelector<HTMLElement>('#outside')!.dispatchEvent(
      new Event('pointerdown', { bubbles: true }),
    );
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('finds an option by typing its first letter', () => {
    const { host, press } = setup();
    press('m');
    expect(host.control.value).toBe('mechanic');
  });

  it('marks the control as touched when it closes', () => {
    const { fixture, host, trigger } = setup();
    expect(host.control.touched).toBe(false);
    trigger().click();
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();
    expect(host.control.touched).toBe(true);
  });

  it('does not open when disabled by the form', () => {
    const { fixture, host, trigger, options } = setup();
    host.control.disable();
    fixture.detectChanges();
    expect(trigger().disabled).toBe(true);
    trigger().click();
    fixture.detectChanges();
    expect(options().length).toBe(0);
  });

  it('shows the error and links it to the field', () => {
    const { fixture, host, el, trigger } = setup();
    host.error.set('Elige un rol');
    fixture.detectChanges();
    const message = el.querySelector('[role="alert"]');
    expect(message?.textContent).toContain('Elige un rol');
    expect(trigger().getAttribute('aria-invalid')).toBe('true');
    expect(trigger().getAttribute('aria-describedby')).toBe(message?.id);
  });
});

describe('Select without a visible label', () => {
  @Component({
    imports: [Select],
    template: `<app-select
      ariaLabel="Rol de Ana"
      size="sm"
      [options]="options"
      [value]="value()"
      (valueChange)="value.set($event)"
    />`,
  })
  class Standalone {
    readonly options = OPTIONS;
    readonly value = signal<string | null>('mechanic');
  }

  it('uses the aria-label, and works with value and valueChange', () => {
    const fixture = TestBed.createComponent(Standalone);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector<HTMLButtonElement>('button')!;
    expect(trigger.getAttribute('aria-label')).toBe('Rol de Ana');
    expect(trigger.textContent).toContain('Mecánico');
    trigger.click();
    fixture.detectChanges();
    el.querySelectorAll<HTMLElement>('[role="option"]')[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('advisor');
  });
});
