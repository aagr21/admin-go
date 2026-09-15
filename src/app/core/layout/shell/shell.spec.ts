import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAdminGoApi } from '@core/api/api.provider';
import { AdminGoStore } from '@core/services/admin-go.store';
import { Shell } from './shell';

/** Simula el ancho de pantalla que consulta el componente al pulsar el botón. */
function stubViewport(isMobile: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('Shell · navegación adaptable', () => {
  let fixture: ComponentFixture<Shell>;

  beforeEach(async () => {
    sessionStorage.setItem('admingo.session', 'usr-1');
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideRouter([]), provideAdminGoApi()],
    }).compileComponents();
    await TestBed.inject(AdminGoStore).load();
    fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
  });

  const toggle = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('.topbar__toggle') as HTMLButtonElement;

  const backdrop = (): HTMLElement | null => fixture.nativeElement.querySelector('.backdrop');

  it('en móvil el botón abre el cajón y aparece el velo', () => {
    stubViewport(true);
    expect(backdrop()).toBeNull();

    toggle().click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.shell--nav-open')).toBeTruthy();
    expect(backdrop()).toBeTruthy();
  });

  it('en escritorio el botón repliega el rail y no hay velo', () => {
    stubViewport(false);

    toggle().click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.shell--collapsed')).toBeTruthy();
    expect(backdrop()).toBeNull();
  });

  it('el velo cierra el cajón', () => {
    stubViewport(true);
    toggle().click();
    fixture.detectChanges();

    backdrop()?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.shell--nav-open')).toBeFalsy();
    expect(backdrop()).toBeNull();
  });

  it('las etiquetas del menú siempre están en el DOM para el cajón móvil', () => {
    // Se ocultan por CSS en el rail de escritorio, no por plantilla.
    const labels = fixture.nativeElement.querySelectorAll('.nav__link span');
    expect(labels.length).toBeGreaterThan(0);
  });
});
