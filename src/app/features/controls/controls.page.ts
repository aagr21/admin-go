import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '@core/auth/auth.store';
import { AdminGoStore } from '@core/services/admin-go.store';
import { CONTROL_SHIFTS, CONTROL_STATUSES, ControlShift, ControlStatus } from '@core/models/enums';
import { OperationalControl } from '@core/models/entities';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatDateTime, formatLiters } from '@shared/util/format';
import { toneForControlStatus } from '@shared/util/status';

/**
 * Pantalla de Control Operativo de Planta (§11) y ciclo de vida del §10.
 *
 * Es el servicio central de AdminGo: el supervisor programa el control, registra
 * su llegada, verifica en campo y lo cierra generando el informe. Antes solo
 * existía el modelo de datos, sin ninguna forma de operarlo.
 */
@Component({
  selector: 'app-controls-page',
  imports: [ReactiveFormsModule, StatusBadge],
  templateUrl: './controls.page.html',
  styleUrl: './controls.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlsPage {
  private readonly store = inject(AdminGoStore);
  private readonly auth = inject(AuthStore);
  private readonly forms = inject(FormBuilder);

  protected readonly shifts = CONTROL_SHIFTS;
  protected readonly statuses = CONTROL_STATUSES;

  protected readonly plants = this.store.plants;
  protected readonly controls = this.store.operationalControls;
  protected readonly busy = this.store.busy;
  protected readonly canCreate = this.store.can('create');
  protected readonly canClose = this.store.can('close');

  protected readonly formatLiters = formatLiters;
  protected readonly formatDateTime = formatDateTime;
  protected readonly toneForControlStatus = toneForControlStatus;

  protected readonly statusFilter = signal<ControlStatus | 'all'>('all');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly closing = signal(false);
  protected readonly validationMessage = signal<string | null>(null);

  /** Supervisores disponibles para asignar (§10 «Asignación del supervisor»). */
  protected readonly supervisors = computed(() =>
    this.store
      .users()
      .filter(
        (user) =>
          user.active &&
          (user.role === 'Supervisor operativo AdminGo' || user.role === 'Operador de campo'),
      ),
  );

  protected readonly filtered = computed(() => {
    const status = this.statusFilter();
    const controls = [...this.controls()].sort((a, b) =>
      b.scheduledAt.localeCompare(a.scheduledAt),
    );
    return status === 'all' ? controls : controls.filter((control) => control.status === status);
  });

  protected readonly selected = computed<OperationalControl | null>(() => {
    const id = this.selectedId();
    return id === null ? null : (this.controls().find((control) => control.id === id) ?? null);
  });

  protected readonly selectedEvidences = computed(() => {
    const control = this.selected();
    return control ? this.store.evidencesOfControl(control.id) : [];
  });

  protected readonly selectedIncidents = computed(() => {
    const control = this.selected();
    return control ? this.store.incidents().filter((item) => item.controlId === control.id) : [];
  });

  protected readonly selectedQuality = computed(() => {
    const control = this.selected();
    return control
      ? this.store.qualityControls().filter((item) => control.qualityControlIds.includes(item.id))
      : [];
  });

  /** Saldo proyectado mientras se llena el cierre (§14). */
  protected readonly projectedBalance = signal<number | null>(null);

  /** Evidencia que se adjunta al control seleccionado (§10). */
  protected readonly evidenceDescription = signal('');
  protected readonly evidenceError = signal<string | null>(null);
  private pickedEvidence = signal<{ name: string; mimeType: string } | null>(null);

  protected readonly createForm = this.forms.nonNullable.group({
    plantId: ['', Validators.required],
    scheduledAt: ['', Validators.required],
    shift: ['Mañana' as ControlShift, Validators.required],
    supervisor: ['', Validators.required],
    product: ['Diésel Importado', Validators.required],
    initialVolume: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly closeForm = this.forms.nonNullable.group({
    receivedVolume: [0, [Validators.required, Validators.min(0)]],
    dispatchedVolume: [0, [Validators.required, Validators.min(0)]],
    cisternsIn: [0, [Validators.required, Validators.min(0)]],
    cisternsOut: [0, [Validators.required, Validators.min(0)]],
    sealsVerified: [0, [Validators.required, Validators.min(0)]],
    documentsVerified: [0, [Validators.required, Validators.min(0)]],
    observation: [''],
    openIncident: [false],
    incidentDescription: [''],
  });

  protected startCreate(): void {
    this.createForm.reset({
      plantId: this.plants()[0]?.id ?? '',
      scheduledAt: '',
      shift: 'Mañana',
      supervisor: this.supervisors()[0]?.fullName ?? '',
      product: 'Diésel Importado',
      initialVolume: 0,
    });
    this.validationMessage.set(null);
    this.creating.set(true);
  }

  protected cancelCreate(): void {
    this.creating.set(false);
  }

  protected async submitCreate(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    await this.store.createControl(this.createForm.getRawValue());
    this.creating.set(false);
  }

  protected select(control: OperationalControl): void {
    this.selectedId.set(control.id);
    this.closing.set(false);
    this.validationMessage.set(null);
    this.closeForm.reset({
      receivedVolume: control.receivedVolume,
      dispatchedVolume: control.dispatchedVolume,
      cisternsIn: control.cisternsIn,
      cisternsOut: control.cisternsOut,
      sealsVerified: control.sealsVerified,
      documentsVerified: control.documentsVerified,
      observation: control.observation,
      openIncident: false,
      incidentDescription: '',
    });
    this.recalculateBalance();
  }

  /** §10 «Llegada a planta» + «Apertura del control». */
  protected async registerArrival(control: OperationalControl): Promise<void> {
    await this.store.openControl(control.id);
  }

  protected startClosing(): void {
    this.closing.set(true);
    this.recalculateBalance();
  }

  protected cancelClosing(): void {
    this.closing.set(false);
  }

  /** Mantiene el saldo proyectado en vivo mientras se registran volúmenes (§14). */
  protected recalculateBalance(): void {
    const control = this.selected();
    if (!control) {
      this.projectedBalance.set(null);
      return;
    }
    const { receivedVolume, dispatchedVolume } = this.closeForm.getRawValue();
    this.projectedBalance.set(control.initialVolume + receivedVolume - dispatchedVolume);
  }

  /** §10 «Cierre del control» + «Generación automática del informe». */
  protected async submitClosure(): Promise<void> {
    const control = this.selected();
    if (!control || this.closeForm.invalid) {
      this.closeForm.markAllAsTouched();
      return;
    }
    const value = this.closeForm.getRawValue();
    if (value.openIncident && value.incidentDescription.trim().length === 0) {
      this.validationMessage.set('Describe la incidencia antes de cerrar con escalamiento.');
      return;
    }
    this.validationMessage.set(null);
    await this.store.closeControl(control.id, {
      ...value,
      observation: value.observation.trim(),
      incidentDescription: value.incidentDescription.trim(),
      closedBy: this.currentUserName(),
    });
    this.closing.set(false);
  }

  /** Quién cierra el control, para el informe y la auditoría (§27). */
  private currentUserName(): string {
    return this.auth.currentUser()?.fullName ?? 'sistema';
  }

  protected onEvidencePicked(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.pickedEvidence.set(
      file ? { name: file.name, mimeType: file.type || 'application/octet-stream' } : null,
    );
  }

  protected onEvidenceDescription(event: Event): void {
    this.evidenceDescription.set((event.target as HTMLInputElement).value);
  }

  /** §10 «Carga de fotografías y evidencias». */
  protected async attachEvidence(control: OperationalControl): Promise<void> {
    const file = this.pickedEvidence();
    if (!file) {
      this.evidenceError.set('Selecciona la fotografía o el documento a adjuntar.');
      return;
    }
    this.evidenceError.set(null);
    await this.store.createEvidence({
      kind: file.mimeType.startsWith('image/') ? 'photo' : 'pdf',
      fileName: file.name,
      description: this.evidenceDescription().trim() || 'Evidencia del control operativo.',
      capturedBy: this.currentUserName(),
      operationId: null,
      plantId: control.plantId,
      tankId: null,
      documentId: null,
      controlId: control.id,
    });
    this.pickedEvidence.set(null);
    this.evidenceDescription.set('');
  }

  protected plantLabel(plantId: string): string {
    const plant = this.store.plantById(plantId);
    return plant ? `${plant.code} · ${plant.name}` : '—';
  }

  protected onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as ControlStatus | 'all');
  }
}
