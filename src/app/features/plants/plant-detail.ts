import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import {
  formatDateTime,
  formatLiters,
  labelForPlantStatus,
  toneForStatus,
} from '@shared/util/format';

/** Ficha individual de planta — toda su operación (§9, §11). */
@Component({
  selector: 'app-plant-detail',
  imports: [StatusBadge, RouterLink],
  templateUrl: './plant-detail.html',
  styleUrl: './plant-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlantDetail {
  private readonly store = inject(AdminGoStore);

  /** Id de planta recibido desde la ruta (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly plant = computed(() => this.store.plantById(this.id()));
  protected readonly operations = computed(() => {
    const plant = this.plant();
    return plant ? this.store.operationsOfPlant(plant.id) : [];
  });
  protected readonly alerts = computed(() => {
    const plant = this.plant();
    return plant ? this.store.alertsOfPlant(plant.id) : [];
  });
  protected readonly controls = computed(() => {
    const plant = this.plant();
    return plant
      ? this.store.operationalControls().filter((control) => control.plantId === plant.id)
      : [];
  });

  protected readonly formatLiters = formatLiters;
  protected readonly formatDateTime = formatDateTime;
  protected readonly labelForPlantStatus = labelForPlantStatus;
  protected readonly toneForStatus = toneForStatus;
}
