import { Component, inject } from '@angular/core';
import { WorkshopStore } from '../../../../core/workshops';
import { CardComponent } from '../../../../shared/components';

@Component({
  selector: 'app-dashboard-page',
  imports: [CardComponent],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  readonly workshop = inject(WorkshopStore);
}
