import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Button } from './button';

describe('Button', () => {
  let component: Button;
  let fixture: ComponentFixture<Button>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Button],
    }).compileComponents();

    fixture = TestBed.createComponent(Button);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ariaLabel', () => {
    const inner = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    it('has no aria-label by default, so the visible text is the name', () => {
      expect(inner().hasAttribute('aria-label')).toBe(false);
    });

    it('sets the aria-label when given', async () => {
      fixture.componentRef.setInput('ariaLabel', 'Editar a Ana Pérez');
      await fixture.whenStable();
      expect(inner().getAttribute('aria-label')).toBe('Editar a Ana Pérez');
    });
  });
  describe('ariaExpanded and ariaControls', () => {
    const inner = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    it('sets none by default', () => {
      expect(inner().hasAttribute('aria-expanded')).toBe(false);
      expect(inner().hasAttribute('aria-controls')).toBe(false);
    });

    it('puts them on the real button, including a closed state', async () => {
      fixture.componentRef.setInput('ariaExpanded', false);
      fixture.componentRef.setInput('ariaControls', 'panel');
      await fixture.whenStable();
      expect(inner().getAttribute('aria-expanded')).toBe('false');
      expect(inner().getAttribute('aria-controls')).toBe('panel');
      fixture.componentRef.setInput('ariaExpanded', true);
      await fixture.whenStable();
      expect(inner().getAttribute('aria-expanded')).toBe('true');
    });
  });
});
