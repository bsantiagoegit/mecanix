import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UpdateService } from '@core/pwa';
import { ThemeService } from '@core/theme';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: ThemeService, useValue: { init: vi.fn() } },
        { provide: UpdateService, useValue: { init: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialise theme and updates on start', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(TestBed.inject(ThemeService).init).toHaveBeenCalled();
    expect(TestBed.inject(UpdateService).init).toHaveBeenCalled();
  });

  it('should render the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
});
