import { Component, input, model, output } from '@angular/core';
import { Button } from '@shared/components/button/button';
import { Modal } from '@shared/components/modal/modal';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { CustomerInput } from '../../models/customer.model';
import { CustomerDialogView } from '../../services/customer-dialog.state';
import { CustomerForm, IdentificationConflict, PhoneWarning } from '../customer-form/customer-form';

/**
 * Modal de cliente, el mismo para registrar y para editar (UC-CUST-01 y 04). Es presentacional:
 * muestra lo que le dicen sus entradas y avisa de lo que el usuario hace; quien lo usa lo conecta
 * a `CustomerDialogState`.
 */
@Component({
  selector: 'app-customer-dialog',
  imports: [Button, CustomerForm, Modal, Skeleton],
  templateUrl: './customer-dialog.html',
})
export class CustomerDialog {
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly view = input<CustomerDialogView>('ready');
  readonly initial = input<CustomerInput | null>(null);
  readonly submitLabel = input('Guardar');
  readonly isSubmitting = input(false);
  readonly error = input<string | null>(null);
  readonly phoneWarning = input<PhoneWarning | null>(null);
  readonly identificationConflict = input<IdentificationConflict | null>(null);

  readonly submitted = output<CustomerInput>();
  readonly phoneChecked = output<string>();
  readonly retry = output<void>();

  readonly skeletonFields = [1, 2, 3, 4];
}
