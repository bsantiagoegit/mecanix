import { TestBed } from '@angular/core/testing';
import { CustomerSearch, SEARCH_DEBOUNCE_MS } from './customer-search';

function setup() {
  TestBed.configureTestingModule({ imports: [CustomerSearch] });
  const fixture = TestBed.createComponent(CustomerSearch);
  const emitted: string[] = [];
  fixture.componentInstance.search.subscribe((text) => emitted.push(text));
  fixture.detectChanges();
  const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const type = (text: string) => {
    input.value = text;
    input.dispatchEvent(new Event('input'));
  };
  return { fixture, emitted, input, type };
}

describe('CustomerSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders a labelled search input', () => {
    const { fixture, input } = setup();
    expect(input.type).toBe('search');
    expect(fixture.nativeElement.querySelector('label')?.textContent).toContain('Buscar cliente');
  });

  it('does not emit on every keystroke: it waits until the user stops typing', () => {
    const { emitted, type } = setup();
    type('a');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50);
    type('an');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50);
    type('ana');
    expect(emitted).toEqual([]);

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(emitted).toEqual(['ana']);
  });

  it('emits the text without surrounding spaces', () => {
    const { emitted, type } = setup();
    type('  ana pérez  ');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(emitted).toEqual(['ana pérez']);
  });

  it('does not emit twice for the same text', () => {
    const { emitted, type } = setup();
    type('ana');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    type('ana ');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(emitted).toEqual(['ana']);
  });

  it('emits an empty text when the user clears the field', () => {
    const { emitted, type } = setup();
    type('ana');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    type('');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(emitted).toEqual(['ana', '']);
  });

  it('shows the placeholder and the hint it receives', () => {
    TestBed.configureTestingModule({ imports: [CustomerSearch] });
    const fixture = TestBed.createComponent(CustomerSearch);
    fixture.componentRef.setInput('placeholder', 'Nombre o apellido');
    fixture.componentRef.setInput('hint', 'Solo por nombre');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('input')?.placeholder).toBe('Nombre o apellido');
    expect(element.textContent).toContain('Solo por nombre');
  });
});
