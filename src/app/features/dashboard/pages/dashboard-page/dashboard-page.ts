import { Component, inject } from '@angular/core';
import { WorkshopFacade } from '@core/workshops';
import { Card } from '@shared/components/card/card';

@Component({
  selector: 'app-dashboard-page',
  imports: [Card],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  readonly workshop = inject(WorkshopFacade);
}
