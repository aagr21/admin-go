import { Routes } from '@angular/router';
import { authGuard, moduleGuard } from '@core/auth/auth.guard';
import { Shell } from '@core/layout/shell/shell';

/**
 * Rutas de AdminGo: `Shell` es el layout raíz (barra lateral §7) y cada módulo
 * se carga de forma diferida como hijo suyo. El acceso exige sesión activa
 * (`authGuard`, P1 §33) y permisos por rol según la matriz §6 (`moduleGuard`).
 * Los parámetros de las rutas de detalle (`plants/:id`, `operations/:code`) se
 * vinculan a `input.required` gracias a `withComponentInputBinding()`.
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard, moduleGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'operations',
        loadComponent: () => import('./features/operations/operations').then((m) => m.Operations),
      },
      {
        path: 'operations/:code',
        loadComponent: () =>
          import('./features/operations/passport/operation-passport').then(
            (m) => m.OperationPassport,
          ),
      },
      {
        path: 'plants',
        loadComponent: () => import('./features/plants/plants').then((m) => m.Plants),
      },
      {
        path: 'plants/:id',
        loadComponent: () => import('./features/plants/plant-detail').then((m) => m.PlantDetail),
      },
      {
        path: 'stations',
        loadComponent: () =>
          import('./features/stations/stations.page').then((m) => m.StationsPage),
      },
      {
        path: 'tanks',
        loadComponent: () => import('./features/tanks/tanks.page').then((m) => m.TanksPage),
      },
      {
        path: 'cisterns',
        loadComponent: () =>
          import('./features/cisterns/cisterns.page').then((m) => m.CisternsPage),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/documents.page').then((m) => m.DocumentsPage),
      },
      {
        path: 'declarations',
        loadComponent: () =>
          import('./features/declarations/declarations.page').then((m) => m.DeclarationsPage),
      },
      {
        path: 'volumes',
        loadComponent: () => import('./features/volumes/volumes').then((m) => m.VolumesPage),
      },
      {
        path: 'quality',
        loadComponent: () => import('./features/quality/quality.page').then((m) => m.QualityPage),
      },
      {
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alerts').then((m) => m.AlertsPage),
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('./features/companies/companies.page').then((m) => m.CompaniesPage),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/audit/audit.page').then((m) => m.AuditPage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
