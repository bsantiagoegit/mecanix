import '@testing-library/jest-dom/vitest';

// jsdom no implementa `<dialog>.showModal()` ni `close()`: un polyfill mínimo para los specs
// de modales (abre y cierra, y emite `close` como el navegador).
if (typeof HTMLDialogElement !== 'undefined') {
  const proto = HTMLDialogElement.prototype as Partial<HTMLDialogElement>;
  if (typeof proto.showModal !== 'function') {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    proto.close = function close(this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
}
