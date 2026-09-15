import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminGoStore } from '@core/services/admin-go.store';

/**
 * Módulo Configuración — parámetros y reglas configurables (§14).
 *
 * Los roles y la matriz de requisitos ya no viven aquí: se movieron a
 * «Usuarios y roles» (§6) y «Cumplimiento» (§16), que es donde el documento
 * sitúa cada cosa. Este módulo se queda con lo que le corresponde: los umbrales.
 */
@Component({
  selector: 'app-settings-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Configuración</h1>
          <p class="ag-page__sub">
            Umbrales y reglas configurables por cliente y actividad (§14). Nunca codificados
            rígidamente.
          </p>
        </div>
      </header>

      <div class="settings">
        <article class="ag-card">
          <p class="ag-card__title">Umbrales operativos</p>
          <p class="ag-card__sub">
            Afectan al semáforo de la interfaz y a la clasificación de los reportes: ambos usan
            exactamente estas reglas.
          </p>

          <label class="field">
            <span>Diferencia máxima permitida (%)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              [value]="maxDifference()"
              (input)="onMaxDifference($event)"
            />
            <small>Por encima de este valor la diferencia se marca crítica (§14).</small>
          </label>

          <label class="field">
            <span>Días de aviso previo de vencimiento</span>
            <input
              type="number"
              min="0"
              step="1"
              [value]="warningDays()"
              (input)="onWarningDays($event)"
            />
            <small>Ventana en la que un documento pasa a «Próximo a vencer» (§15).</small>
          </label>

          <label class="field">
            <span>Días sin cierre para alertar una operación</span>
            <input
              type="number"
              min="0"
              step="1"
              [value]="stalledDays()"
              (input)="onStalledDays($event)"
            />
            <small>Genera la alerta operativa del §25.</small>
          </label>

          <div class="ag-row actions">
            <button
              class="ag-btn ag-btn--primary"
              type="button"
              (click)="save()"
              [disabled]="busy()"
            >
              Guardar parámetros
            </button>
            @if (saved()) {
              <span class="saved" role="status">
                Parámetros guardados y registrados en auditoría.
              </span>
            }
          </div>
        </article>

        <article class="ag-card">
          <p class="ag-card__title">Dónde se configura el resto</p>
          <ul class="links">
            <li>
              <a routerLink="/users">Usuarios y roles</a> — altas de usuario y matriz de permisos
              por acción (§6).
            </li>
            <li>
              <a routerLink="/compliance">Cumplimiento</a> — requisitos y matriz por tipo de cliente
              (§16).
            </li>
          </ul>
        </article>
      </div>
    </section>
  `,
  styles: `
    .settings {
      display: grid;
      gap: 1.25rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      margin: 0.9rem 0;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--ag-ink-soft);
    }

    .field input {
      padding: 0.5rem 0.65rem;
      border-radius: var(--ag-radius-sm);
      border: 1px solid var(--ag-line);
      font: inherit;
      font-weight: 400;
      text-transform: none;
      color: var(--ag-ink);
      max-width: 260px;
    }

    .field small {
      font-size: 0.72rem;
      font-weight: 400;
      text-transform: none;
      color: var(--ag-ink-muted);
    }

    .actions {
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .saved {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--ag-ok-ink);
    }

    .links {
      margin: 0;
      padding-left: 1.1rem;
      display: grid;
      gap: 0.4rem;
      font-size: 0.85rem;
      color: var(--ag-ink-soft);
    }

    .links a {
      color: var(--ag-primary-600);
      font-weight: 600;
    }
  `,
})
export class SettingsPage {
  private readonly store = inject(AdminGoStore);

  protected readonly maxDifference = this.store.maxVolumeDifferencePercent;
  protected readonly warningDays = this.store.documentWarningDays;
  protected readonly stalledDays = this.store.stalledOperationDays;
  protected readonly busy = this.store.busy;
  protected readonly saved = signal(false);

  protected onMaxDifference(event: Event): void {
    this.store.maxVolumeDifferencePercent.set(this.toNumber(event));
    this.saved.set(false);
  }

  protected onWarningDays(event: Event): void {
    this.store.documentWarningDays.set(this.toNumber(event));
    this.saved.set(false);
  }

  protected onStalledDays(event: Event): void {
    this.store.stalledOperationDays.set(this.toNumber(event));
    this.saved.set(false);
  }

  protected async save(): Promise<void> {
    await this.store.saveSettings();
    this.saved.set(true);
  }

  /** Convierte la entrada a un número no negativo; ignora valores no numéricos. */
  private toNumber(event: Event): number {
    const parsed = Number((event.target as HTMLInputElement).value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
}
