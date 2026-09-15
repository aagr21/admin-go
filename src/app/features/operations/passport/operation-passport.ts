import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatDateTime, formatLiters } from '@shared/util/format';
import {
  toneForAlertSeverity,
  toneForDocumentStatus,
  toneForOperationStatus,
} from '@shared/util/status';

interface PassportStage {
  label: string;
  value: string;
  detail: string;
}

/** Pasaporte Digital de una operación: toda su historia en una pantalla (§13). */
@Component({
  selector: 'app-operation-passport',
  imports: [StatusBadge, RouterLink],
  templateUrl: './operation-passport.html',
  styleUrl: './operation-passport.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationPassport {
  private readonly store = inject(AdminGoStore);

  /** Código de operación recibido desde la ruta (withComponentInputBinding). */
  readonly code = input.required<string>();

  protected readonly operation = computed(() => this.store.operationByCode(this.code()));
  protected readonly plant = computed(() => {
    const op = this.operation();
    return op ? this.store.plantById(op.plantId) : undefined;
  });
  protected readonly station = computed(() => {
    const op = this.operation();
    return op ? this.store.stationById(op.stationId) : undefined;
  });
  protected readonly tank = computed(() => {
    const op = this.operation();
    return op ? this.store.tankById(op.tankId) : undefined;
  });
  protected readonly driver = computed(() => {
    const op = this.operation();
    return op ? this.store.driverById(op.driverId) : undefined;
  });
  protected readonly documents = computed(() => {
    const op = this.operation();
    return op ? this.store.documentsOfOperation(op.id) : [];
  });
  protected readonly evidences = computed(() => {
    const op = this.operation();
    return op ? this.store.evidencesOfOperation(op.id) : [];
  });
  protected readonly incidents = computed(() => {
    const op = this.operation();
    return op ? this.store.incidents().filter((incident) => incident.operationId === op.id) : [];
  });

  protected readonly stages = computed<PassportStage[]>(() => {
    const op = this.operation();
    if (!op) {
      return [];
    }
    return [
      { label: 'Origen', value: op.origin, detail: 'Punto de partida de la operación' },
      { label: 'Producto', value: op.product, detail: 'Producto asociado al documento' },
      { label: 'Volumen', value: formatLiters(op.documentedVolume), detail: 'Volumen documentado' },
      {
        label: 'Documentos',
        value: `${this.documents().length} asociados`,
        detail: 'Requisitos verificados',
      },
      {
        label: 'Cisterna',
        value: op.cisternPlate,
        detail: `Conductor: ${this.driver()?.fullName ?? '—'}`,
      },
      { label: 'Transporte', value: op.type, detail: `Precintos: ${op.sealCodes.join(', ')}` },
      {
        label: 'Destino',
        value: op.destination,
        detail: this.station()?.name ?? this.plant()?.name ?? '—',
      },
      {
        label: 'Recepción',
        value: op.receivedVolume ? formatLiters(op.receivedVolume) : 'Pendiente',
        detail: formatDateTime(op.updatedAt),
      },
      {
        label: 'Tanque',
        value: this.tank()?.code ?? 'No aplica',
        detail: this.tank()?.product ?? '—',
      },
      { label: 'Salida / Venta', value: op.status, detail: 'Estado final de la operación' },
    ];
  });

  protected readonly formatLiters = formatLiters;
  protected readonly formatDateTime = formatDateTime;
  protected readonly toneForOperationStatus = toneForOperationStatus;
  protected readonly toneForDocumentStatus = toneForDocumentStatus;
  protected readonly toneForAlertSeverity = toneForAlertSeverity;
}
