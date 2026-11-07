import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UpdateService } from '@core/pwa';
import { ThemeService } from '@core/theme';
import { signal } from '@angular/core';
import { ToastService } from '@shared/services/toast.service';
import { App } from './app';

describe('App', () => {
  const updateReady = signal(false);
  const applyUpdate = vi.fn(() => Promise.resolve());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: ThemeService, useValue: { init: vi.fn() } },
        { provide: UpdateService, useValue: { init: vi.fn(), updateReady, applyUpdate } },
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

  it('should offer a reload toast when an update is ready', async () => {
    const fixture = TestBed.createComponent(App);
    updateReady.set(true);
    await fixture.whenStable();

    const [toast] = TestBed.inject(ToastService).toasts();
    expect(toast.action?.label).toBe('Recargar');
    toast.action?.run();
    expect(applyUpdate).toHaveBeenCalled();
  });

  it('should show an error toast when the update fails', async () => {
    applyUpdate.mockRejectedValueOnce(new Error('fail'));
    const fixture = TestBed.createComponent(App);
    updateReady.set(true);
    await fixture.whenStable();

    const toasts = TestBed.inject(ToastService);
    toasts.toasts()[0].action?.run();
    await Promise.resolve();
    await Promise.resolve();
    expect(toasts.toasts().some((t) => t.type === 'error')).toBe(true);
  });
});
