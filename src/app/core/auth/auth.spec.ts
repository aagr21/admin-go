import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Component } from '@angular/core';
import { NAV_GROUPS } from '@core/layout/navigation';
import { authGuard, moduleGuard } from './auth.guard';
import { AuthStore, DEMO_PASSWORD } from './auth.store';
import { canAccessModule, filterNavGroups, modulesForRole } from './role-access';
import { LoginPage } from '@features/login/login';

const state = { url: '/reports' } as RouterStateSnapshot;

describe('AuthStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('autentica con las credenciales demo válidas', () => {
    const store = TestBed.inject(AuthStore);
    const result = store.login('admin', DEMO_PASSWORD);

    expect(result.ok).toBe(true);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.currentUser()?.username).toBe('admin');
  });

  it('normaliza mayúsculas y espacios en el usuario', () => {
    const store = TestBed.inject(AuthStore);
    expect(store.login('  ADMIN ', DEMO_PASSWORD).ok).toBe(true);
  });

  it('rechaza la contraseña incorrecta', () => {
    const store = TestBed.inject(AuthStore);
    const result = store.login('admin', 'otra-clave');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('incorrectos');
    expect(store.isAuthenticated()).toBe(false);
  });

  it('rechaza un usuario inexistente', () => {
    const store = TestBed.inject(AuthStore);
    expect(store.login('intruso', DEMO_PASSWORD).ok).toBe(false);
  });

  it('cierra la sesión', () => {
    const store = TestBed.inject(AuthStore);
    store.login('admin', DEMO_PASSWORD);
    store.logout();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.currentUser()).toBeNull();
  });

  it('restaura la sesión tras recargar (sessionStorage)', () => {
    TestBed.inject(AuthStore).login('admin', DEMO_PASSWORD);

    TestBed.resetTestingModule();
    const rehydrated = TestBed.inject(AuthStore);

    expect(rehydrated.isAuthenticated()).toBe(true);
    expect(rehydrated.currentUser()?.id).toBe('usr-1');
  });
});

describe('Matriz de roles (§6)', () => {
  it('el Superadministrador accede a los 18 módulos', () => {
    expect(modulesForRole('Superadministrador AdminGo').length).toBe(18);
    expect(canAccessModule('Superadministrador AdminGo', '/settings')).toBe(true);
  });

  it('el Auditor consulta pero no opera', () => {
    expect(canAccessModule('Auditor', '/audit')).toBe(true);
    expect(canAccessModule('Auditor', '/operations')).toBe(false);
  });

  it('el Operador de campo no ve Empresas', () => {
    expect(canAccessModule('Operador de campo', '/companies')).toBe(false);
    expect(canAccessModule('Operador de campo', '/volumes')).toBe(true);
  });

  it('las rutas de detalle heredan el permiso del módulo', () => {
    expect(canAccessModule('Gerente', '/operations/AG-DI-2026-000001')).toBe(true);
    expect(canAccessModule('Auditor', '/operations/AG-DI-2026-000001')).toBe(false);
  });

  it('sin rol no hay acceso ni menú', () => {
    expect(canAccessModule(null, '/dashboard')).toBe(false);
    expect(filterNavGroups(NAV_GROUPS, null)).toEqual([]);
  });

  it('filtra el menú lateral según el rol', () => {
    const groups = filterNavGroups(NAV_GROUPS, 'Responsable EESS');
    const paths = groups.flatMap((group) => group.items.map((item) => item.path));

    expect(paths).toContain('/stations');
    expect(paths).toContain('/tanks');
    expect(paths).not.toContain('/operations');
    expect(paths).not.toContain('/settings');
  });
});

describe('Guards', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('authGuard redirige a /login conservando el destino', () => {
    const tree = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, state),
    );

    expect(tree).toBeInstanceOf(UrlTree);
    expect((tree as UrlTree).toString()).toContain('/login');
    expect((tree as UrlTree).toString()).toContain('returnUrl=%2Freports');
  });

  it('moduleGuard deja pasar al rol autorizado', () => {
    sessionStorage.setItem('admingo.session', 'usr-1'); // Superadministrador
    TestBed.inject(AuthStore); // rehidrata la sesión antes del guard

    const result = TestBed.runInInjectionContext(() =>
      moduleGuard({} as ActivatedRouteSnapshot, state),
    );
    expect(result).toBe(true);
  });

  it('moduleGuard desvía al dashboard al rol no autorizado', () => {
    sessionStorage.setItem('admingo.session', 'usr-8'); // Auditor
    TestBed.inject(AuthStore);

    const result = TestBed.runInInjectionContext(() =>
      moduleGuard({} as ActivatedRouteSnapshot, { url: '/operations' } as RouterStateSnapshot),
    );

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/dashboard');
  });
});

@Component({ selector: 'app-dummy', template: '' })
class DummyPage {}

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  function setup() {
    TestBed.configureTestingModule({
      imports: [LoginPage, DummyPage],
      providers: [provideRouter([{ path: 'dashboard', component: DummyPage }])],
    });
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(LoginPage);
    fixture.autoDetectChanges();
    return { router, fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('muestra el error con credenciales inválidas', async () => {
    const { fixture, el } = setup();
    const username = el.querySelector('input[type="text"]') as HTMLInputElement;
    username.value = 'admin';
    username.dispatchEvent(new Event('input'));
    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(el.querySelector('.login__error')?.textContent).toContain('incorrectos');
    expect(TestBed.inject(AuthStore).isAuthenticated()).toBe(false);
  });

  it('autentica y navega al dashboard con el usuario demo', async () => {
    const { router, fixture, el } = setup();
    const demoButton = el.querySelector('.login__demo-user') as HTMLButtonElement;
    demoButton.click(); // rellena admin + contraseña demo
    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(TestBed.inject(AuthStore).isAuthenticated()).toBe(true);
    expect(router.url).toBe('/dashboard');
  });
});
