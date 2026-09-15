import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminGoStore } from '@core/services/admin-go.store';
import { USER_ROLES } from '@core/models/enums';

/** Módulo Configuración — parámetros y reglas configurables (§14, §6). */
@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Configuración</h1>
          <p class="ag-page__sub">Parámetros y reglas configurables por cliente y actividad.</p>
        </div>
      </header>

      <div class="settings">
        <article class="ag-card">
          <p class="ag-card__title">Umbrales volumétricos</p>
          <p class="ag-card__sub">Nunca codificados rígidamente para todos los clientes (§14).</p>
          <label class="field">
            <span>Diferencia máxima permitida (%)</span>
            <input
              type="number"
              step="0.1"
              [value]="maxDifference()"
              (input)="onMaxDifference($event)"
            />
          </label>
          <label class="field">
            <span>Días de aviso previo de vencimiento</span>
            <input type="number" [value]="warningDays()" (input)="onWarningDays($event)" />
          </label>
          <button class="ag-btn ag-btn--primary" type="button">Guardar parámetros</button>
        </article>

        <article class="ag-card">
          <p class="ag-card__title">Roles del sistema</p>
          <p class="ag-card__sub">Roles y permisos configurables (§6).</p>
          <ul class="roles">
            @for (role of roles; track role) {
              <li>{{ role }}</li>
            }
          </ul>
        </article>

        <article class="ag-card">
          <p class="ag-card__title">Requisitos de la matriz de cumplimiento</p>
          <p class="ag-card__sub">
            REQUISITO → DOCUMENTO → ESTADO → EVIDENCIA → RESPONSABLE → FECHA
          </p>
          <table class="ag-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Requisito</th>
                <th>Aplica a</th>
                <th>Obligatorio</th>
                <th class="ag-num">Vigencia (días)</th>
              </tr>
            </thead>
            <tbody>
              @for (requirement of requirements(); track requirement.id) {
                <tr>
                  <td class="ag-mono">{{ requirement.code }}</td>
                  <td>{{ requirement.name }}</td>
                  <td>{{ requirement.appliesTo }}</td>
                  <td>{{ requirement.mandatory ? 'Sí' : 'No' }}</td>
                  <td class="ag-num">{{ requirement.validityDays }}</td>
                </tr>
              }
            </tbody>
          </table>
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
      margin: 0.75rem 0;
      font-size: 0.82rem;
      color: var(--ag-ink-soft);
    }

    .field input {
      padding: 0.5rem 0.65rem;
      border-radius: 8px;
      border: 1px solid var(--ag-line);
      font: inherit;
      max-width: 260px;
    }

    .roles {
      margin: 0;
      padding-left: 1.1rem;
      display: grid;
      gap: 0.35rem;
      font-size: 0.85rem;
    }
  `,
})
export class SettingsPage {
  private readonly store = inject(AdminGoStore);
  protected readonly requirements = this.store.requirements;
  protected readonly roles = USER_ROLES;
  protected readonly maxDifference = this.store.maxVolumeDifferencePercent;
  protected readonly warningDays = this.store.documentWarningDays;

  protected toNumber(event: Event): number {
    const value = (event.target as HTMLInputElement).value;
    return Number(value);
  }

  protected onMaxDifference(event: Event): void {
    this.store.maxVolumeDifferencePercent.set(this.toNumber(event));
  }

  protected onWarningDays(event: Event): void {
    this.store.documentWarningDays.set(this.toNumber(event));
  }
}
