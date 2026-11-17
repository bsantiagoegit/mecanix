import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Skeleton, SkeletonVariant } from './skeleton';

@Component({
  imports: [Skeleton],
  template: `<app-skeleton
    [variant]="variant()"
    [width]="width()"
    [height]="height()"
    [count]="count()"
  />`,
})
class Host {
  readonly variant = signal<SkeletonVariant>('text');
  readonly width = signal('100%');
  readonly height = signal<string | null>(null);
  readonly count = signal(1);
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    bars: () => el.querySelectorAll<HTMLElement>('span > span'),
    el,
  };
}

describe('Skeleton', () => {
  it('is decorative for assistive technology', () => {
    const { el } = setup();
    expect(el.querySelector('span')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws one bar by default and as many as count says', () => {
    const { fixture, host, bars } = setup();
    expect(bars().length).toBe(1);
    host.count.set(3);
    fixture.detectChanges();
    expect(bars().length).toBe(3);
  });

  it('never draws fewer than one bar', () => {
    const { fixture, host, bars } = setup();
    host.count.set(0);
    fixture.detectChanges();
    expect(bars().length).toBe(1);
  });

  it.each([
    ['text', '1rem', 'rounded'],
    ['rect', '2.75rem', 'rounded-md'],
  ] as const)('%s uses its default height', (variant, height, rounded) => {
    const { fixture, host, bars } = setup();
    host.variant.set(variant);
    fixture.detectChanges();
    expect(bars()[0].style.height).toBe(height);
    expect(bars()[0].className).toContain(rounded);
  });

  it('makes a circle as tall as it is wide', () => {
    const { fixture, host, bars } = setup();
    host.variant.set('circle');
    host.width.set('2rem');
    fixture.detectChanges();
    expect(bars()[0].style.height).toBe('2rem');
    expect(bars()[0].className).toContain('rounded-full');
  });

  it('respects an explicit height and width', () => {
    const { fixture, host, bars, el } = setup();
    host.height.set('5rem');
    host.width.set('50%');
    fixture.detectChanges();
    expect(bars()[0].style.height).toBe('5rem');
    expect((el.querySelector('span') as HTMLElement).style.width).toBe('50%');
  });

  it('only pulses when the user accepts motion', () => {
    const { bars } = setup();
    expect(bars()[0].className).toContain('motion-safe:animate-pulse');
  });
});
