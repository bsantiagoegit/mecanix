import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    console.error('Unhandled error:', error);
    // TODO Fase 2: enviar a Sentry
  }
}
