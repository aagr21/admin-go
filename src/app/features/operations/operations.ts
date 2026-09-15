import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OPERATION_STATUSES, OPERATION_TYPES } from '@core/models/enums';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatDateTime, formatLiters, formatPercent, toneForStatus } from '@shared/util/format';

/** Módulo Operaciones — listado y acceso al Pasaporte Digital (§12, §13). */
@Component({
  selector: 'app-operations',
  imports: [StatusBadge, RouterLink],
  templateUrl: './operations.html',
  styleUrl: './operations.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Operations {
  private readonly store = inject(AdminGoStore);

  protected readonly statuses = OPERATION_STATUSES;
  protected readonly types = OPERATION_TYPES;
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly typeFilter = signal('all');

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.store.operations().filter((operation) => {
      const matchesStatus =
        this.statusFilter() === 'all' || operation.status === this.statusFilter();
      const matchesType = this.typeFilter() === 'all' || operation.type === this.typeFilter();
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
  protected readonly toneForStatus = toneForStatus;

  protected deviation(operation: { documentedVolume: number; receivedVolume: number }): number {
    if (!operation.documentedVolume || !operation.receivedVolume) {
      return 0;
    }
    return (
      ((operation.receivedVolume - operation.documentedVolume) / operation.documentedVolume) * 100
    );
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  protected onTypeChange(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
  }
}
