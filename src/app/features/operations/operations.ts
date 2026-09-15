import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  OPERATION_STATUSES,
  OPERATION_TYPES,
  OperationStatus,
  OperationType,
} from '@core/models/enums';
import { Operation } from '@core/models/entities';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatDateTime, formatLiters, formatPercent } from '@shared/util/format';
import { toneForOperationStatus } from '@shared/util/status';

/**
 * Módulo Operaciones — alta, edición, listado y acceso al Pasaporte Digital
 * (§12, §13).
 *
 * Toda operación nace con un identificador único que asigna el origen de datos,
 * no el formulario: así el código no depende de lo que teclee el usuario.
 */
@Component({
  selector: 'app-operations',
  imports: [StatusBadge, RouterLink, ReactiveFormsModule],
  templateUrl: './operations.html',
  styleUrl: './operations.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Operations {
  private readonly store = inject(AdminGoStore);
  private readonly forms = inject(FormBuilder);

  protected readonly statuses = OPERATION_STATUSES;
  protected readonly types = OPERATION_TYPES;
  protected readonly search = signal('');
  protected readonly statusFilter = signal<OperationStatus | 'all'>('all');
  protected readonly typeFilter = signal<OperationType | 'all'>('all');

  protected readonly canCreate = this.store.can('create');
  protected readonly canUpdate = this.store.can('update');
  protected readonly busy = this.store.busy;
  protected readonly companies = this.store.companies;
  protected readonly plants = this.store.plants;
  protected readonly stations = this.store.stations;
  protected readonly tanks = this.store.tanks;
  protected readonly cisterns = this.store.cisterns;
  protected readonly drivers = this.store.drivers;

  /** `null` cuando el formulario está cerrado; id cuando se está editando. */
  protected readonly editingId = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.forms.nonNullable.group({
    type: ['Recepción' as OperationType, Validators.required],
    status: ['Programada' as OperationStatus, Validators.required],
    product: ['Diésel Importado', Validators.required],
    origin: ['', Validators.required],
    destination: ['', Validators.required],
    companyId: ['', Validators.required],
    scheduledVolume: [0, [Validators.required, Validators.min(0)]],
    documentedVolume: [0, [Validators.required, Validators.min(0)]],
    receivedVolume: [0, [Validators.required, Validators.min(0)]],
    cisternPlate: ['', Validators.required],
    driverId: ['', Validators.required],
    plantId: [''],
    stationId: [''],
    tankId: [''],
    scheduledAt: ['', Validators.required],
  });

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const type = this.typeFilter();
    return this.store.operations().filter((operation) => {
      const matchesStatus = status === 'all' || operation.status === status;
      const matchesType = type === 'all' || operation.type === type;
      const matchesTerm =
        !term ||
        operation.code.toLowerCase().includes(term) ||
        operation.product.toLowerCase().includes(term) ||
        operation.origin.toLowerCase().includes(term) ||
        operation.destination.toLowerCase().includes(term) ||
        operation.cisternPlate.toLowerCase().includes(term);
      return matchesStatus && matchesType && matchesTerm;
    });
  });

  protected readonly formatLiters = formatLiters;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatPercent = formatPercent;
  protected readonly toneForOperationStatus = toneForOperationStatus;

  protected deviation(operation: { documentedVolume: number; receivedVolume: number }): number {
    if (!operation.documentedVolume || !operation.receivedVolume) {
      return 0;
    }
    return (
      ((operation.receivedVolume - operation.documentedVolume) / operation.documentedVolume) * 100
    );
  }

  protected startCreate(): void {
    this.formError.set(null);
    this.editingId.set(null);
    this.form.reset({
      type: 'Recepción',
      status: 'Programada',
      product: 'Diésel Importado',
      origin: '',
      destination: '',
      companyId: this.companies()[0]?.id ?? '',
      scheduledVolume: 0,
      documentedVolume: 0,
      receivedVolume: 0,
      cisternPlate: this.cisterns()[0]?.plate ?? '',
      driverId: this.drivers()[0]?.id ?? '',
      plantId: '',
      stationId: '',
      tankId: '',
      scheduledAt: '',
    });
    this.formOpen.set(true);
  }

  /** Carga la operación en el formulario para modificarla (§12). */
  protected startEdit(operation: Operation): void {
    this.formError.set(null);
    this.editingId.set(operation.id);
    this.form.reset({
      type: operation.type,
      status: operation.status,
      product: operation.product,
      origin: operation.origin,
      destination: operation.destination,
      companyId: operation.companyId,
      scheduledVolume: operation.scheduledVolume,
      documentedVolume: operation.documentedVolume,
      receivedVolume: operation.receivedVolume,
      cisternPlate: operation.cisternPlate,
      driverId: operation.driverId,
      plantId: operation.plantId ?? '',
      stationId: operation.stationId ?? '',
      tankId: operation.tankId ?? '',
      scheduledAt: operation.scheduledAt.slice(0, 16),
    });
    this.formOpen.set(true);
  }

  protected cancelForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
    this.formError.set(null);
  }

  protected async submitForm(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const draft = {
      ...value,
      plantId: value.plantId === '' ? null : value.plantId,
      stationId: value.stationId === '' ? null : value.stationId,
      tankId: value.tankId === '' ? null : value.tankId,
    };
    this.formError.set(null);
    const editing = this.editingId();
    if (editing === null) {
      await this.store.createOperation(draft);
    } else {
      await this.store.updateOperation(editing, draft);
    }
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as OperationStatus | 'all');
  }

  protected onTypeChange(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value as OperationType | 'all');
  }
}
