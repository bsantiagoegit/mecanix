import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Modal } from './modal';

@Component({
  imports: [Modal],
  template: `
    <app-modal
      title="Nuevo cliente"
      [size]="size()"
      [closable]="closable()"
      [(isOpen)]="open"
      (closed)="closedCount.set(closedCount() + 1)"
    >
      @if (open()) {
        <input id="first" />
        <input id="second" />
      }
      <button actions type="button" id="action">Guardar</button>
    </app-modal>
  `,
})
class Host {
  readonly open = signal(false);
  readonly size = signal<'sm' | 'md' | 'lg'>('md');
  readonly closable = signal(true);
  readonly closedCount = signal(0);
}

async function setup() {
  TestBed.configureTestingModule({ imports: [Host] });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, host: fixture.componentInstance, dialog, settle };
}

describe('Modal', () => {
  it('stays closed until isOpen is true', async () => {
    const { dialog } = await setup();
    expect(dialog.open).toBe(false);
  });

  it('opens when isOpen becomes true and closes when it becomes false', async () => {
    const { host, dialog, settle } = await setup();

    host.open.set(true);
    await settle();
    expect(dialog.open).toBe(true);

    host.open.set(false);
    await settle();
    expect(dialog.open).toBe(false);
  });

  it('shows the title and labels the dialog with it', async () => {
    const { dialog } = await setup();
    const title = dialog.querySelector('h2')!;
    expect(title.textContent).toContain('Nuevo cliente');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('closes with the close button, syncs isOpen and emits closed', async () => {
    const { host, dialog, settle } = await setup();
    host.open.set(true);
    await settle();

    (dialog.querySelector('button[aria-label="Cerrar"]') as HTMLButtonElement).click();
    await settle();

    expect(host.open()).toBe(false);
    expect(dialog.open).toBe(false);
    expect(host.closedCount()).toBe(1);
  });

  it('syncs isOpen when the dialog is closed natively (Esc)', async () => {
    const { host, dialog, settle } = await setup();
    host.open.set(true);
    await settle();

    dialog.close();
    await settle();

    expect(host.open()).toBe(false);
    expect(host.closedCount()).toBe(1);
  });

  it('emits closed once per closing, also when the parent closes it', async () => {
    const { host, settle } = await setup();
    host.open.set(true);
    await settle();
    host.open.set(false);
    await settle();
    expect(host.closedCount()).toBe(1);
  });

  it('does not close on a click outside (on the backdrop)', async () => {
    const { host, dialog, settle } = await setup();
    host.open.set(true);
    await settle();

    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();

    expect(dialog.open).toBe(true);
    expect(host.open()).toBe(true);
  });

  it('puts the focus on the first field, not on the close button', async () => {
    const { host, fixture, settle } = await setup();
    host.open.set(true);
    await settle();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#first'));
  });

  describe('not closable', () => {
    it('has no close button', async () => {
      const { host, dialog, settle } = await setup();
      host.closable.set(false);
      host.open.set(true);
      await settle();
      expect(dialog.querySelector('button[aria-label="Cerrar"]')).toBeNull();
    });

    it('ignores Esc', async () => {
      const { host, dialog, settle } = await setup();
      host.closable.set(false);
      host.open.set(true);
      await settle();

      const cancel = new Event('cancel', { cancelable: true });
      dialog.dispatchEvent(cancel);

      expect(cancel.defaultPrevented).toBe(true);
    });
  });

  it('lets Esc through when it is closable', async () => {
    const { host, dialog, settle } = await setup();
    host.open.set(true);
    await settle();
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(false);
  });

  it.each([
    ['sm', 'max-w-sm'],
    ['md', 'max-w-lg'],
    ['lg', 'max-w-2xl'],
  ] as const)('applies the %s size', async (size, cssClass) => {
    const { host, dialog, settle } = await setup();
    host.size.set(size);
    await settle();
    expect(dialog.className).toContain(cssClass);
  });

  it('renders the actions slot in the footer', async () => {
    const { dialog } = await setup();
    expect(dialog.querySelector('footer #action')).not.toBeNull();
  });

  it('only creates the content while it is open', async () => {
    const { host, dialog, settle } = await setup();
    expect(dialog.querySelector('#first')).toBeNull();
    host.open.set(true);
    await settle();
    expect(dialog.querySelector('#first')).not.toBeNull();
    host.open.set(false);
    await settle();
    expect(dialog.querySelector('#first')).toBeNull();
  });
});
