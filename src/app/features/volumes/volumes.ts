import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Volume } from '@core/models/entities';
import { AdminGoStore } from '@core/services/admin-go.store';
import { formatDateTime, formatLiters, Tone } from '@shared/util/format';
import { toneForVolumeDifference } from '@shared/util/status';

/** Módulo Volúmenes — movimientos de inventario por tanque y trazabilidad (§14). */
@Component({
  selector: 'app-volumes',
  imports: [RouterLink],
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Volúmenes</h1>
          <p class="ag-page__sub">
            Movimientos de inventario por tanque y trazabilidad de volúmenes por operación (§14).
          </p>
        </div>
      </header>

      <div class="vol-kpis">
        <article class="ag-card vol-kpi">
          <p class="vol-kpi__label">Recibido hoy (red)</p>
          <p class="vol-kpi__value">{{ formatLiters(kpis().receivedVolume) }}</p>
        </article>
        <article class="ag-card vol-kpi">
          <p class="vol-kpi__label">Despachado hoy (red)</p>
          <p class="vol-kpi__value">{{ formatLiters(kpis().dispatchedVolume) }}</p>
        </article>
        <article class="ag-card vol-kpi">
          <p class="vol-kpi__label">Inventario teórico</p>
          <p class="vol-kpi__value">{{ formatLiters(kpis().theoreticalInventory) }}</p>
        </article>
        <article class="ag-card vol-kpi">
          <p class="vol-kpi__label">Inventario físico</p>
          <p class="vol-kpi__value">{{ formatLiters(kpis().physicalInventory) }}</p>
        </article>
        <article class="ag-card vol-kpi">
          <p class="vol-kpi__label">Diferencia</p>
          <p [class]="'vol-kpi__value vol-diff--' + diffTone()">
            {{ formatLiters(kpis().volumeDifference) }}
          </p>
        </article>
      </div>

      <article class="ag-card">
        <header class="ag-card__head">
          <div>
            <p class="ag-card__title">Movimientos de inventario (tanques)</p>
            <p class="ag-card__sub">
              Cada movimiento queda asociado a su operación y saldo resultante.
            </p>
          </div>
        </header>
        <table class="ag-table ag-table--stack">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tanque</th>
              <th>Dirección</th>
              <th class="ag-num">Cantidad</th>
              <th class="ag-num">Saldo resultante</th>
              <th>Operación</th>
            </tr>
          </thead>
          <tbody>
            @for (movement of movements(); track movement.id) {
              <tr>
                <td data-label="Fecha">{{ formatDateTime(movement.recordedAt) }}</td>
                <td data-label="Tanque" class="ag-mono">{{ tankCode(movement.tankId) }}</td>
                <td data-label="Dirección">
                  <span [class]="'vol-dir vol-dir--' + directionTone(movement.direction)">
                    {{ directionLabel(movement.direction) }}
                  </span>
                </td>
                <td data-label="Cantidad" class="ag-num">{{ formatLiters(movement.quantity) }}</td>
                <td data-label="Saldo resultante" class="ag-num">
                  {{ formatLiters(movement.balanceAfter) }}
                </td>
                <td data-label="Operación">
                  @if (operationRef(movement.operationId); as operation) {
                    <a class="vol-link ag-mono" [routerLink]="['/operations', operation.code]">
                      {{ operation.code }}
                    </a>
                  } @else {
                    <span class="ag-muted">—</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="ag-muted">Sin movimientos registrados.</td>
              </tr>
            }
          </tbody>
        </table>
      </article>
      <article class="ag-card">
        <header class="ag-card__head">
          <div>
            <p class="ag-card__title">Volúmenes por operación</p>
            <p class="ag-card__sub">Trazabilidad de ingresos y salidas en plantas y estaciones.</p>
          </div>
        </header>
        <table class="ag-table ag-table--stack">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Operación</th>
              <th>Ubicación</th>
              <th>Dirección</th>
              <th class="ag-num">Cantidad</th>
              <th>Autorizado por</th>
            </tr>
          </thead>
          <tbody>
            @for (volume of volumes(); track volume.id) {
              <tr>
                <td data-label="Fecha">{{ formatDateTime(volume.recordedAt) }}</td>
                <td data-label="Operación">
                  @if (operationRef(volume.operationId); as operation) {
                    <a class="vol-link ag-mono" [routerLink]="['/operations', operation.code]">
                      {{ operation.code }}
                    </a>
                  } @else {
                    <span class="ag-muted">—</span>
                  }
                </td>
                <td data-label="Ubicación">{{ locationLabel(volume) }}</td>
                <td data-label="Dirección">
                  <span [class]="'vol-dir vol-dir--' + directionTone(volume.direction)">
                    {{ directionLabel(volume.direction) }}
                  </span>
                </td>
                <td data-label="Cantidad" class="ag-num">{{ formatLiters(volume.quantity) }}</td>
                <td data-label="Autorizado por">{{ volume.authorizedBy ?? '—' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="ag-muted">Sin registros de volúmenes.</td>
              </tr>
            }
          </tbody>
        </table>
      </article>
    </section>
  `,
  styles: `
    .vol-kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 0.85rem;
    }

    .vol-kpi {
      padding: 0.9rem 1.1rem;
    }

    .vol-kpi__label {
      margin: 0;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ag-ink-soft, #64748b);
    }

    .vol-kpi__value {
      margin: 0.3rem 0 0;
      font-size: 1.2rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .vol-diff--ok {
      color: var(--ag-ok, #16a34a);
    }

    .vol-diff--warn {
      color: var(--ag-warn, #f59e0b);
    }

    .vol-diff--danger {
      color: var(--ag-danger, #dc2626);
    }

    .vol-dir {
      display: inline-flex;
      padding: 0.1rem 0.55rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      background: var(--ag-neutral-bg);
      color: var(--ag-neutral-ink);
    }

    .vol-dir--ok {
      background: var(--ag-ok-bg);
      color: var(--ag-ok-ink);
    }

    .vol-dir--info {
      background: var(--ag-info-bg);
      color: var(--ag-info-ink);
    }

    .vol-dir--warn {
      background: var(--ag-warn-bg);
      color: var(--ag-warn-ink);
    }

    .vol-link {
      color: var(--ag-primary-600, #2563eb);
      font-weight: 600;
    }

    .vol-link:hover {
      text-decoration: underline;
    }

    .ag-card + .ag-card {
      margin-top: 1.25rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VolumesPage {
  private readonly store = inject(AdminGoStore);

  protected readonly kpis = this.store.kpis;
  protected readonly volumes = this.store.volumes;
  protected readonly movements = this.store.inventoryMovements;
  protected readonly formatLiters = formatLiters;
  protected readonly formatDateTime = formatDateTime;
  protected readonly diffTone = computed(() =>
    toneForVolumeDifference(
      this.kpis().volumeDifference,
      this.kpis().theoreticalInventory,
      this.store.maxVolumeDifferencePercent(),
    ),
  );

  protected operationRef(operationId: string | null) {
    return this.store.operationById(operationId);
  }

  protected tankCode(tankId: string): string {
    return this.store.tankById(tankId)?.code ?? '—';
  }

  protected locationLabel(volume: Volume): string {
    if (volume.plantId) {
      return this.store.plants().find((p) => p.id === volume.plantId)?.name ?? volume.plantId;
    }
    if (volume.stationId) {
      return this.store.stations().find((s) => s.id === volume.stationId)?.name ?? volume.stationId;
    }
    return '—';
  }

  protected directionLabel(direction: Volume['direction']): string {
    switch (direction) {
      case 'ingreso':
        return 'Ingreso';
      case 'salida':
        return 'Salida';
      case 'ajuste':
        return 'Ajuste';
      default:
        return direction;
    }
  }

  protected directionTone(direction: Volume['direction']): Tone {
    switch (direction) {
      case 'ingreso':
        return 'ok';
      case 'salida':
        return 'info';
      case 'ajuste':
        return 'warn';
      default:
        return 'neutral';
    }
  }
}
