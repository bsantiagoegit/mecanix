import { TestBed } from '@angular/core/testing';
import { CustomerVehicle } from '../../models/customer.model';
import { CustomerVehicleList } from './customer-vehicle-list';

const vehicle = (over: Partial<CustomerVehicle> = {}): CustomerVehicle => ({
  ownershipId: 'o1',
  vehicleId: 'v1',
  licensePlate: 'PBA-1234',
  make: 'Kia',
  model: 'Rio',
  year: 2020,
  startedAt: '2026-03-01T15:00:00Z',
  endedAt: null,
  vehicleDeleted: false,
  ...over,
});

function setup(vehicles: CustomerVehicle[], showPeriod = false) {
  const fixture = TestBed.createComponent(CustomerVehicleList);
  fixture.componentRef.setInput('vehicles', vehicles);
  fixture.componentRef.setInput('showPeriod', showPeriod);
  fixture.componentRef.setInput('label', 'Historial');
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('CustomerVehicleList', () => {
  it('shows plate, make, model and year, and names the list', () => {
    const el = setup([vehicle()]);
    expect(el.querySelector('ul')?.getAttribute('aria-label')).toBe('Historial');
    expect(el.textContent).toContain('PBA-1234');
    expect(el.textContent).toContain('Kia Rio');
    expect(el.textContent).toContain('2020');
  });

  it('hides the period and the badge unless asked', () => {
    const el = setup([vehicle()]);
    expect(el.textContent).not.toContain('Desde');
    expect(el.textContent).not.toContain('Actual');
  });

  it('shows "Actual" with the start date for a vehicle that is theirs today', () => {
    const text = setup([vehicle()], true).textContent!.replace(/\s+/g, ' ');
    expect(text).toContain('Actual');
    expect(text).toMatch(/Desde 1 mar 2026/);
    expect(text).not.toContain('hasta');
  });

  it('shows "Anterior" with both dates for one that is not', () => {
    const text = setup([vehicle({ endedAt: '2026-06-01T15:00:00Z' })], true).textContent!.replace(
      /\s+/g,
      ' ',
    );
    expect(text).toContain('Anterior');
    expect(text).toMatch(/Desde 1 mar 2026 hasta 1 jun 2026/);
  });

  it('marks a deleted vehicle and does not link it anywhere', () => {
    const el = setup([vehicle({ vehicleDeleted: true })]);
    expect(el.textContent).toContain('Eliminado');
    expect(el.querySelector('a')).toBeNull();
  });
});
