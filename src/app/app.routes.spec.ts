import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAdminGoApi } from '@core/api/api.provider';
import { AdminGoStore } from '@core/services/admin-go.store';
import { App } from './app';
import { routes } from './app.routes';

/** Humo de enrutado: garantiza que la app renderiza contenido real (no página en blanco). */
describe('App routing (con sesión de administrador)', () => {
  beforeEach(async () => {
    sessionStorage.setItem('admingo.session', 'usr-1'); // admin · Superadministrador
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideAdminGoApi()],
    }).compileComponents();
    await TestBed.inject(AdminGoStore).load();
  });

  it('redirige la raíz al dashboard y monta el Shell con la barra lateral', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    fixture.autoDetectChanges();
    await router.navigateByUrl('/');
    await fixture.whenStable();

    expect(router.url).toBe('/dashboard');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-shell')).toBeTruthy();
  });

  it('renderiza la Torre de Control en /dashboard', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    fixture.autoDetectChanges();
    await router.navigateByUrl('/dashboard');
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-dashboard')).toBeTruthy();
    expect(compiled.textContent).toContain('Torre de Control');
    expect(compiled.textContent).toContain('Plantas monitoreadas');
  });

  it('carga el módulo Volúmenes en /volumes', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    fixture.autoDetectChanges();
    await router.navigateByUrl('/volumes');
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-volumes')).toBeTruthy();
    expect(compiled.textContent).toContain('Movimientos de inventario');
  });

  it('redirige rutas desconocidas al dashboard', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    fixture.autoDetectChanges();
    await router.navigateByUrl('/ruta-inexistente');
    await fixture.whenStable();

    expect(router.url).toBe('/dashboard');
    expect(fixture.nativeElement.querySelector('app-dashboard')).toBeTruthy();
  });
});

describe('App routing sin sesión', () => {
  it('redirige al login cuando no hay sesión activa', async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideAdminGoApi()],
    }).compileComponents();
    await TestBed.inject(AdminGoStore).load();

    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    fixture.autoDetectChanges();
    await router.navigateByUrl('/dashboard');
    await fixture.whenStable();

    expect(router.url).toContain('/login');
    expect(router.url).toContain('returnUrl=%2Fdashboard');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-login')).toBeTruthy();
  });
});

describe('App routing · módulos nuevos', () => {
  beforeEach(async () => {
    sessionStorage.setItem('admingo.session', 'usr-1'); // Superadministrador
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideAdminGoApi()],
    }).compileComponents();
    await TestBed.inject(AdminGoStore).load();
  });

  const cases: { url: string; selector: string; text: string }[] = [
    { url: '/controls', selector: 'app-controls-page', text: 'Control operativo de planta' },
    { url: '/users', selector: 'app-users-page', text: 'Usuarios y roles' },
    { url: '/compliance', selector: 'app-compliance-page', text: 'Matriz de cumplimiento' },
    { url: '/declarations', selector: 'app-declarations-page', text: 'CHECK ADMIN GO' },
    { url: '/documents', selector: 'app-documents-page', text: 'Documentos' },
  ];

  for (const { url, selector, text } of cases) {
    it(`monta ${selector} en ${url}`, async () => {
      const router = TestBed.inject(Router);
      const fixture = TestBed.createComponent(App);
      fixture.autoDetectChanges();
      await router.navigateByUrl(url);
      await fixture.whenStable();

      expect(router.url).toBe(url);
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector(selector)).toBeTruthy();
      expect(compiled.textContent).toContain(text);
    });
  }
});
