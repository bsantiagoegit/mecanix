import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Tooltip } from './tooltip';

@Component({
  imports: [Tooltip],
  template: `<app-tooltip ariaLabel="Ayuda"><span id="content">Texto de ayuda</span></app-tooltip>
    <button id="outside" type="button">fuera</button>`,
})
class Host {}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const trigger = el.querySelector<HTMLButtonElement>('app-tooltip button')!;
  const tip = () => el.querySelector('[role="tooltip"]');
  const fire = (type: string, target: Element = trigger) => {
    target.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  return { fixture, el, trigger, tip, fire };
}

describe('Tooltip', () => {
  it('is hidden until asked and names its button', () => {
    const { tip, trigger } = setup();
    expect(tip()).toBeNull();
    expect(trigger.getAttribute('aria-label')).toBe('Ayuda');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows the projected content on hover and hides it when the pointer leaves', () => {
    const { tip, trigger, fire } = setup();
    fire('mouseenter');
    expect(tip()?.textContent).toContain('Texto de ayuda');
    expect(trigger.getAttribute('aria-describedby')).toBe(tip()?.id);
    fire('mouseleave');
    expect(tip()).toBeNull();
  });

  it('shows on keyboard focus and hides on blur', () => {
    const { tip, fire } = setup();
    fire('focus');
    expect(tip()).not.toBeNull();
    fire('blur');
    expect(tip()).toBeNull();
  });

  it('a tap pins it open until the next tap', () => {
    const { tip, trigger, fire } = setup();
    trigger.dispatchEvent(new Event('mouseenter'));
    fire('click');
    fire('mouseleave');
    expect(tip()).not.toBeNull();
    fire('click');
    expect(tip()).toBeNull();
  });

  it('closes with Escape and stops it from reaching a surrounding modal', () => {
    const { fixture, tip, trigger, fire } = setup();
    fire('focus');
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    const stop = vi.spyOn(event, 'stopPropagation');
    trigger.dispatchEvent(event);
    fixture.detectChanges();
    expect(tip()).toBeNull();
    expect(stop).toHaveBeenCalled();
  });

  it('lets Escape through when it is closed', () => {
    const { trigger } = setup();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    trigger.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('closes on a press outside', () => {
    const { el, tip, fire } = setup();
    fire('click');
    fire('pointerdown', el.querySelector('#outside')!);
    expect(tip()).toBeNull();
  });
});
