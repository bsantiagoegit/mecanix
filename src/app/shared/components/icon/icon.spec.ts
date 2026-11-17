import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';
import { APP_ICONS, AppIconName } from './icons';

@Component({
  imports: [Icon],
  template: `<app-icon [name]="name()" [size]="size()" [title]="title()" />`,
})
class Host {
  readonly name = signal<AppIconName>('check');
  readonly size = signal(16);
  readonly title = signal<string | null>(null);
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const svg = () => (fixture.nativeElement as HTMLElement).querySelector('svg')!;
  return { fixture, host: fixture.componentInstance, svg };
}

describe('Icon', () => {
  it('draws the Lucide icon as an SVG that follows the text color', () => {
    const { svg } = setup();
    expect(svg()).not.toBeNull();
    expect(svg().querySelectorAll('path').length).toBeGreaterThan(0);
    expect(svg().getAttribute('stroke')).toBe('currentColor');
  });

  it('is decorative by default', () => {
    const { svg } = setup();
    expect(svg().getAttribute('aria-hidden')).toBe('true');
    expect(svg().querySelector('title')).toBeNull();
  });

  it('announces itself when it has a title', () => {
    const { fixture, host, svg } = setup();
    host.title.set('Guardado');
    fixture.detectChanges();
    expect(svg().querySelector('title')?.textContent).toBe('Guardado');
    expect(svg().getAttribute('aria-hidden')).not.toBe('true');
  });

  it('uses the requested size', () => {
    const { fixture, host, svg } = setup();
    host.size.set(24);
    fixture.detectChanges();
    expect(svg().getAttribute('width')).toBe('24');
    expect(svg().getAttribute('height')).toBe('24');
  });

  it('changes the drawing when the name changes', () => {
    const { fixture, host, svg } = setup();
    const before = svg().innerHTML;
    host.name.set('x');
    fixture.detectChanges();
    expect(svg().innerHTML).not.toBe(before);
  });

  it.each(Object.keys(APP_ICONS) as AppIconName[])('has a drawing for "%s"', (name) => {
    const { fixture, host, svg } = setup();
    host.name.set(name);
    fixture.detectChanges();
    expect(svg().children.length).toBeGreaterThan(0);
  });
});
