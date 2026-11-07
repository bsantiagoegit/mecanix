import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { UpdateService } from './update.service';

describe('UpdateService', () => {
  const versionUpdates = new Subject<{ type: string }>();
  const swUpdate = {
    isEnabled: true,
    versionUpdates,
    activateUpdate: vi.fn(() => Promise.resolve(true)),
    checkForUpdate: vi.fn(() => Promise.resolve(false)),
  };

  beforeEach(() => {
    vi.spyOn(globalThis, 'setInterval').mockReturnValue(
      0 as unknown as ReturnType<typeof setInterval>,
    );
    TestBed.configureTestingModule({ providers: [{ provide: SwUpdate, useValue: swUpdate }] });
  });

  afterEach(() => vi.restoreAllMocks());

  it('should flag updateReady only on VERSION_READY', () => {
    const service = TestBed.inject(UpdateService);
    service.init();
    expect(service.updateReady()).toBe(false);

    versionUpdates.next({ type: 'VERSION_DETECTED' });
    expect(service.updateReady()).toBe(false);

    versionUpdates.next({ type: 'VERSION_READY' });
    expect(service.updateReady()).toBe(true);
  });

  it('should do nothing when the service worker is disabled', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: SwUpdate, useValue: { ...swUpdate, isEnabled: false } }],
    });
    const service = TestBed.inject(UpdateService);
    service.init();
    versionUpdates.next({ type: 'VERSION_READY' });
    expect(service.updateReady()).toBe(false);
  });

  it('should activate the update when applied', () => {
    TestBed.inject(UpdateService).applyUpdate();
    expect(swUpdate.activateUpdate).toHaveBeenCalled();
  });
});
