import { TestBed } from '@angular/core/testing';
import { VehicleSummary } from '../../models/vehicle.model';
import { VehicleCard } from './vehicle-card';

const vehicle = (over: Partial<VehicleSummary> = {}): VehicleSummary => ({
  id: 'v1',
  licensePlate: 'PBA-1234',
  make: 'Chevrolet',
  model: 'Spark',
  year: 2018,
  vin: null,
  hasKey: true,
  keyCode: '4821',
  owner: { id: 'c1', firstName: 'Carlos', lastName: 'Cliente' },
  ...over,
});

function setup(v: VehicleSummary) {
  const fixture = TestBed.createComponent(VehicleCard);
  fixture.componentRef.setInput('vehicle', v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('VehicleCard', () => {
  it('shows the plate, make, model, year and owner', () => {
    const el = setup(vehicle());
    expect(el.textContent).toContain('PBA-1234');
    expect(el.textContent).toContain('Chevrolet Spark · 2018');
    expect(el.textContent).toContain('Carlos Cliente');
  });

  it('shows the key hidden, with its eye button', () => {
    const el = setup(vehicle());
    expect(el.querySelector('app-key-display')).not.toBeNull();
    expect(el.textContent).toContain('•••••');
    expect(el.textContent).not.toContain('4821');
  });

  it('says "Sin clave" when the vehicle has no key', () => {
    const el = setup(vehicle({ hasKey: false, keyCode: null }));
    expect(el.querySelector('app-key-display')).toBeNull();
    expect(el.textContent).toContain('Sin clave');
  });

  it('says there is no owner when there is none', () => {
    const el = setup(vehicle({ owner: null }));
    expect(el.textContent).toContain('Sin propietario actual');
  });

  it('shows the VIN only when it has one', () => {
    expect(setup(vehicle()).textContent).not.toContain('VIN');
    TestBed.resetTestingModule();
    expect(setup(vehicle({ vin: '1HGBH41JXMN109186' })).textContent).toContain(
      'VIN 1HGBH41JXMN109186',
    );
  });
});
