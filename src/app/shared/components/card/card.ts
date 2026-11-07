import { Component, input } from '@angular/core';
import { cn } from '../../utils/cn';

@Component({
  selector: 'app-card',
  templateUrl: './card.html',
})
export class Card {
  readonly padding = input<'none' | 'sm' | 'md' | 'lg'>('md');

  readonly classes = () =>
    cn(
      'bg-surface border border-border rounded-lg',
      this.padding() === 'none' && '',
      this.padding() === 'sm' && 'p-3',
      this.padding() === 'md' && 'p-4',
      this.padding() === 'lg' && 'p-6',
    );
}
