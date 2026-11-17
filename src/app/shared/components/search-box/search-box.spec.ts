import { TestBed } from '@angular/core/testing';
import { SEARCH_DEBOUNCE_MS, SearchBox } from './search-box';

function setup() {
  TestBed.configureTestingModule({ imports: [SearchBox] });
  const fixture = TestBed.createComponent(SearchBox);
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

describe('SearchBox', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders a labelled search input', () => {
    const { fixture, input } = setup();
    expect(input.type).toBe('search');
    expect(fixture.nativeElement.querySelector('label')?.textContent).toContain('Buscar');
  });

  it('shows the label it receives', () => {
    TestBed.configureTestingModule({ imports: [SearchBox] });
    const fixture = TestBed.createComponent(SearchBox);
    fixture.componentRef.setInput('label', 'Buscar vehículo');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('label')?.textContent).toContain('Buscar vehículo');
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
    TestBed.configureTestingModule({ imports: [SearchBox] });
    const fixture = TestBed.createComponent(SearchBox);
    fixture.componentRef.setInput('placeholder', 'Nombre o apellido');
    fixture.componentRef.setInput('hint', 'Solo por nombre');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('input')?.placeholder).toBe('Nombre o apellido');
    expect(element.textContent).toContain('Solo por nombre');
  });
});
