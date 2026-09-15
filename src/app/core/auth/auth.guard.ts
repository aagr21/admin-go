import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';
import { canAccessModule } from './role-access';

/**
 * Exige sesión activa (P1 §33): si no la hay, redirige a /login conservando
 * el destino solicitado en `returnUrl` para volver tras autenticar.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Exige que el rol del usuario (§6) tenga acceso al módulo solicitado.
 * Si no lo tiene, lo deja en el Dashboard en lugar de un error seco.
 */
export const moduleGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const user = auth.currentUser();

  if (!user) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return canAccessModule(user.role, state.url) ? true : router.createUrlTree(['/dashboard']);
};
