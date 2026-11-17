import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CustomerDialogView } from '../../services/customer-dialog.state';
import { CustomerDialog } from './customer-dialog';

function setup(view: CustomerDialogView = 'ready') {
  TestBed.configureTestingModule({ imports: [CustomerDialog], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(CustomerDialog);
  fixture.componentRef.setInput('title', 'Editar cliente');
  fixture.componentRef.setInput('view', view);
  fixture.componentRef.setInput('submitLabel', 'Guardar cambios');
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  const dialog = () => (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
  return { fixture, component: fixture.componentInstance, dialog };
}

describe('CustomerDialog', () => {
  it('shows the title and the form with the submit label', () => {
    const { dialog } = setup();
    expect(dialog().textContent).toContain('Editar cliente');
    expect(dialog().textContent).toContain('Todos los campos son obligatorios');
    expect(dialog().querySelector('app-customer-form')).not.toBeNull();
    expect(dialog().textContent).toContain('Guardar cambios');
  });

  it('shows a skeleton while the customer loads', () => {
    const { dialog } = setup('loading');
    expect(dialog().querySelector('[role="status"]')?.textContent).toContain('Cargando cliente');
    expect(dialog().querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
    expect(dialog().querySelector('app-customer-form')).toBeNull();
  });

  it('says when the customer is gone and closes with Cerrar', () => {
    const { fixture, component, dialog } = setup('not-found');
    expect(dialog().textContent).toContain('Cliente no encontrado');
    [...dialog().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Cerrar'))!
      .click();
    fixture.detectChanges();
    expect(component.open()).toBe(false);
  });

  it('offers to retry when the customer could not be loaded', () => {
    const { component, dialog } = setup('error');
    const retry = vi.fn();
    component.retry.subscribe(retry);
    expect(dialog().textContent).toContain('No se pudo cargar el cliente');
    [...dialog().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('closes when the form is cancelled', () => {
    const { fixture, component, dialog } = setup();
    [...dialog().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Cancelar'))!
      .click();
    fixture.detectChanges();
    expect(component.open()).toBe(false);
  });
});
