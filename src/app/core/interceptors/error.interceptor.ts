import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../auth';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};
