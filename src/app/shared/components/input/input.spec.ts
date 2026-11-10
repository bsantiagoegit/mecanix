import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Input } from './input';

describe('Input', () => {
  let component: Input;
  let fixture: ComponentFixture<Input>;
  const field = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Input],
    }).compileComponents();

    fixture = TestBed.createComponent(Input);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('maxChars and inputmode', () => {
    it('sets no limit and no keyboard hint by default', () => {
      expect(field().hasAttribute('maxlength')).toBe(false);
      expect(field().hasAttribute('inputmode')).toBe(false);
    });

    it('limits what can be typed when maxChars is set', async () => {
      fixture.componentRef.setInput('maxChars', 10);
      await fixture.whenStable();
      expect(field().getAttribute('maxlength')).toBe('10');
    });

    it('asks the phone for a numeric keyboard when inputmode is set', async () => {
      fixture.componentRef.setInput('inputmode', 'numeric');
      await fixture.whenStable();
      expect(field().getAttribute('inputmode')).toBe('numeric');
    });
  });
});
