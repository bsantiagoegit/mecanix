import { TestBed } from '@angular/core/testing';
import { NotFoundError } from '@core/errors';
import { Customer } from '../models/customer.model';
import { DuplicateIdentificationError } from '../models/duplicate-identification.error';
import { CustomerFormState } from './customer-form.state';
import { CustomersService } from './customers.service';

const customer: Customer = {
  id: 'c1',
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: '0987654321',
  email: null,
  identification: null,
  address: null,
};

const match = { id: 'c2', fullName: 'Luis Gómez', phone: '0981112233' };

function deferred<T>() {
  const control = {} as { resolve: (v: T) => void };
  const promise = new Promise<T>((resolve) => {
    control.resolve = resolve;
  });
  return { promise, ...control };
}

describe('CustomerFormState', () => {
  const findByPhone = vi.fn();
  let state: CustomerFormState;

  beforeEach(() => {
    findByPhone.mockReset().mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [CustomerFormState, { provide: CustomersService, useValue: { findByPhone } }],
    });
    state = TestBed.inject(CustomerFormState);
  });

  describe('save', () => {
    it('returns the saved customer', async () => {
      const result = await state.save(() => Promise.resolve(customer), 'falló');
      expect(result).toEqual({ ok: true, customer });
      expect(state.error()).toBeNull();
    });

    it('is submitting while it saves and not after', async () => {
      const pending = deferred<Customer>();
      const saving = state.save(() => pending.promise, 'falló');
      expect(state.isSubmitting()).toBe(true);
      pending.resolve(customer);
      await saving;
      expect(state.isSubmitting()).toBe(false);
    });

    it('reports a taken identification with the customer that has it', async () => {
      const result = await state.save(
        () => Promise.reject(new DuplicateIdentificationError('AB123', match)),
        'falló',
      );
      expect(result).toEqual({ ok: false, reason: 'conflict' });
      expect(state.conflict()).toEqual({ identification: 'AB123', existing: match });
      expect(state.error()).toBeNull();
      expect(state.isSubmitting()).toBe(false);
    });

    it('reports a customer that is no longer there', async () => {
      const result = await state.save(
        () => Promise.reject(new NotFoundError('customer', 'c1')),
        'falló',
      );
      expect(result).toEqual({ ok: false, reason: 'not-found' });
      expect(state.error()).toBeNull();
    });

    it('shows the given message for any other failure', async () => {
      const result = await state.save(() => Promise.reject(new Error('network')), 'No se pudo.');
      expect(result).toEqual({ ok: false, reason: 'failed' });
      expect(state.error()).toBe('No se pudo.');
      expect(state.isSubmitting()).toBe(false);
    });

    it('clears the previous error and conflict when saving again', async () => {
      await state.save(() => Promise.reject(new Error('x')), 'No se pudo.');
      await state.save(() => Promise.reject(new DuplicateIdentificationError('AB1', null)), 'x');
      expect(state.error()).toBeNull();

      await state.save(() => Promise.resolve(customer), 'x');
      expect(state.conflict()).toBeNull();
    });
  });

  describe('checkPhone', () => {
    it('lists the customers that already use the phone', async () => {
      findByPhone.mockResolvedValue([match]);
      await state.checkPhone('w1', '0981112233');
      expect(findByPhone).toHaveBeenCalledWith('w1', '0981112233', undefined);
      expect(state.phoneWarning()).toEqual({ phone: '0981112233', matches: [match] });
    });

    it('passes the customer to leave out when editing', async () => {
      await state.checkPhone('w1', '0981112233', { excludeId: 'c1' });
      expect(findByPhone).toHaveBeenCalledWith('w1', '0981112233', 'c1');
    });

    it('does not check the phone the customer already had', async () => {
      state.phoneWarning.set({ phone: 'x', matches: [match] });
      await state.checkPhone('w1', '0987654321', { ownPhone: '0987654321' });
      expect(findByPhone).not.toHaveBeenCalled();
      expect(state.phoneWarning()).toBeNull();
    });

    it('ignores the answer of a check that was overtaken', async () => {
      const slow = deferred<unknown[]>();
      findByPhone.mockReturnValueOnce(slow.promise).mockResolvedValueOnce([]);

      const first = state.checkPhone('w1', '0981112233');
      await state.checkPhone('w1', '0984445566');
      slow.resolve([match]);
      await first;

      expect(state.phoneWarning()).toEqual({ phone: '0984445566', matches: [] });
    });

    it('lets the user continue when the check fails', async () => {
      findByPhone.mockRejectedValue(new Error('x'));
      await state.checkPhone('w1', '0981112233');
      expect(state.phoneWarning()).toBeNull();
      expect(state.error()).toBeNull();
    });
  });

  describe('reset', () => {
    it('returns to the state of a new form', async () => {
      state.error.set('x');
      state.conflict.set({ identification: 'AB1', existing: null });
      state.phoneWarning.set({ phone: 'x', matches: [match] });
      state.isSubmitting.set(true);

      state.reset();

      expect(state.error()).toBeNull();
      expect(state.conflict()).toBeNull();
      expect(state.phoneWarning()).toBeNull();
      expect(state.isSubmitting()).toBe(false);
    });

    it('drops a phone check that was still in flight', async () => {
      const slow = deferred<unknown[]>();
      findByPhone.mockReturnValueOnce(slow.promise);
      const check = state.checkPhone('w1', '0981112233');

      state.reset();
      slow.resolve([match]);
      await check;

      expect(state.phoneWarning()).toBeNull();
    });
  });
});
