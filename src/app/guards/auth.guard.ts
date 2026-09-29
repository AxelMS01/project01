import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  // Control de navegación local, no autorización del backend: no valida tokens con PHP.
  const router = inject(Router);
  const currentUser = localStorage.getItem('currentUser');

  if (currentUser) {
    return true;
  }

  // Si no está autenticado, redirige al login
  return router.createUrlTree(['/login']);
};
