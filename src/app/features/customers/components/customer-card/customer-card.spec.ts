import { TestBed } from '@angular/core/testing';
import { CustomerSummary } from '../../models/customer.model';
import { CustomerCard } from './customer-card';

const customer = (over: Partial<CustomerSummary> = {}): CustomerSummary => ({
  id: 'c1',
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: '0987654321',
  email: null,
  identification: 'AB123',
  ...over,
});

async function render(value: CustomerSummary) {
  TestBed.configureTestingModule({ imports: [CustomerCard] });
  const fixture = TestBed.createComponent(CustomerCard);
  fixture.componentRef.setInput('customer', value);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('CustomerCard', () => {
  it('shows the full name, the phone and the identification', async () => {
    const element = await render(customer());
    expect(element.textContent).toContain('Ana Pérez');
    expect(element.textContent).toContain('0987654321');
    expect(element.textContent).toContain('AB123');
  });

  it('shows only the name when the contact data is not available (mechanic)', async () => {
    const element = await render(customer({ phone: null, identification: null }));
    expect(element.textContent).toContain('Ana Pérez');
    expect(element.textContent).not.toContain('0987654321');
    expect(element.querySelectorAll('p')).toHaveLength(1);
  });

  it('omits the identification when the customer has none', async () => {
    const element = await render(customer({ identification: null }));
    expect(element.querySelectorAll('p')).toHaveLength(2);
  });
});
