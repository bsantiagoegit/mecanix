import { TestBed } from '@angular/core/testing';
import { LogoPicker, LogoSelection } from './logo-picker';

function setup(currentUrl: string | null = null) {
  const fixture = TestBed.createComponent(LogoPicker);
  fixture.componentRef.setInput('currentUrl', currentUrl);
  const emitted: LogoSelection[] = [];
  fixture.componentInstance.changed.subscribe((value) => emitted.push(value));
  return {
    fixture,
    component: fixture.componentInstance,
    emitted,
    element: fixture.nativeElement as HTMLElement,
  };
}

const pick = (component: LogoPicker, file: File) => {
  const input = document.createElement('input');
  Object.defineProperty(input, 'files', { value: [file] });
  component.onFileSelected({ target: input } as unknown as Event);
};
const file = (type = 'image/png', size = 1000) => {
  const f = new File(['x'], 'logo', { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('LogoPicker', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('shows a placeholder when there is no logo', async () => {
    const { fixture, element } = setup();
    await fixture.whenStable();
    expect(element.textContent).toContain('Sin logo');
    expect(element.textContent).toContain('Subir logo');
    expect(element.querySelector('img')).toBeNull();
  });

  it('shows the current logo and offers to change or remove it', async () => {
    const { fixture, element } = setup('https://x.test/logo.png');
    await fixture.whenStable();
    expect(element.querySelector('img')?.getAttribute('src')).toBe('https://x.test/logo.png');
    expect(element.textContent).toContain('Cambiar logo');
    expect(element.textContent).toContain('Quitar logo');
  });

  it('previews a valid file and reports it', () => {
    const { component, emitted } = setup('https://x.test/logo.png');
    const picked = file();
    pick(component, picked);

    expect(component.shown()).toBe('blob:preview');
    expect(emitted).toEqual([{ file: picked, remove: false }]);
    expect(component.error()).toBeNull();
  });

  it.each([
    ['image/svg+xml', 1000, 'JPG, PNG o WebP'],
    ['image/gif', 1000, 'JPG, PNG o WebP'],
    ['image/png', 6 * 1024 * 1024, 'demasiado pesado'],
  ])('rejects %s (%i bytes) with a message and changes nothing', (type, size, text) => {
    const { component, emitted } = setup('https://x.test/logo.png');
    pick(component, file(type, size));

    expect(component.error()).toContain(text);
    expect(component.shown()).toBe('https://x.test/logo.png');
    expect(emitted).toEqual([]);
  });

  it('removes the current logo, and picking a file afterwards undoes it', () => {
    const { component, emitted } = setup('https://x.test/logo.png');

    component.onRemove();
    expect(component.shown()).toBeNull();
    expect(emitted.at(-1)).toEqual({ file: null, remove: true });

    const picked = file();
    pick(component, picked);
    expect(emitted.at(-1)).toEqual({ file: picked, remove: false });
    expect(component.shown()).toBe('blob:preview');
  });

  it('does not ask to remove a logo that does not exist', () => {
    const { component, emitted } = setup(null);
    component.onRemove();
    expect(emitted.at(-1)).toEqual({ file: null, remove: false });
  });

  it('frees the previous preview when another file is picked and on reset or destroy', () => {
    const { fixture, component } = setup();
    pick(component, file());
    pick(component, file('image/webp'));
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);

    component.reset();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(component.shown()).toBeNull();

    pick(component, file());
    fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
  });

  it('ignores an empty selection', () => {
    const { component, emitted } = setup();
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });
    component.onFileSelected({ target: input } as unknown as Event);
    expect(emitted).toEqual([]);
  });
});
