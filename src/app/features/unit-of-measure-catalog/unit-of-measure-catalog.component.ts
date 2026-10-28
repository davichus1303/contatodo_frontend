import { Component, inject, signal, computed, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UnitOfMeasureService } from '@core/application/unit-of-measures/unit-of-measure.service';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { I18nService } from '@core/i18n/i18n.service';
import { UnitOfMeasureDialogComponent } from './unit-of-measure-dialog/unit-of-measure-dialog.component';
import { UnitOfMeasureDeleteDialogComponent } from './unit-of-measure-delete-dialog/unit-of-measure-delete-dialog.component';
import { UpdateUnitOfMeasureRequest } from '@core/application/dto/unit-of-measure-request.dto';
import { addPendingId, removePendingId } from '@shared/utils/pending-ids.utils';
import { PermissionDirective } from '@shared/directives/permission.directive';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { PermissionService } from '@core/application/permissions/permission.service';

export type SortOption = 'nameAsc' | 'nameDesc' | 'activeFirst' | 'inactiveFirst';

@Component({
  selector: 'app-unit-of-measure-catalog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTooltipModule,
    PermissionDirective
  ],
  templateUrl: './unit-of-measure-catalog.component.html',
  styleUrls: ['./unit-of-measure-catalog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnitOfMeasureCatalogComponent implements OnDestroy {
  private readonly unitOfMeasureService = inject(UnitOfMeasureService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  readonly i18nService = inject(I18nService);
  private readonly destroy$ = new Subject<void>();
  private readonly companySelectionService = inject(CompanySelectionService);
  private readonly permissionService = inject(PermissionService);

  readonly searchControl = new FormControl<string>('');
  readonly sortControl = new FormControl<SortOption>('nameAsc');
  readonly searchTerm = signal<string>('');
  readonly sortOption = signal<SortOption>('nameAsc');
  readonly units = signal<UnitOfMeasure[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly updatingIds = signal<Set<string>>(new Set());

  readonly filteredUnits = computed(() => {
    const searchTerm = this.searchTerm().toLowerCase();
    const sortOption = this.sortOption();
    
    const filtered = this.units().filter(unit =>
      unit.name.toLowerCase().includes(searchTerm) || unit.abrev.toLowerCase().includes(searchTerm)
    );

    switch (sortOption) {
      case 'nameAsc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'nameDesc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'activeFirst':
        filtered.sort((a, b) => {
          if (a.isActive === b.isActive) return a.name.localeCompare(b.name);
          return a.isActive ? -1 : 1;
        });
        break;
      case 'inactiveFirst':
        filtered.sort((a, b) => {
          if (a.isActive === b.isActive) return a.name.localeCompare(b.name);
          return a.isActive ? 1 : -1;
        });
        break;
    }

    return filtered;
  });

  readonly sortOptions: Array<{ value: SortOption; labelKey: string }> = [
    { value: 'nameAsc', labelKey: 'UNIT_OF_MEASURE_CATALOG.SORT.OPTIONS.NAME_ASC' },
    { value: 'nameDesc', labelKey: 'UNIT_OF_MEASURE_CATALOG.SORT.OPTIONS.NAME_DESC' },
    { value: 'activeFirst', labelKey: 'UNIT_OF_MEASURE_CATALOG.SORT.OPTIONS.ACTIVE_FIRST' },
    { value: 'inactiveFirst', labelKey: 'UNIT_OF_MEASURE_CATALOG.SORT.OPTIONS.INACTIVE_FIRST' }
  ];

  constructor() {
    this.searchTerm.set(this.searchControl.value ?? '');
    this.sortOption.set(this.sortControl.value ?? 'nameAsc');

    this.searchControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value: string | null) => {
      this.searchTerm.set(value ?? '');
    });

    this.sortControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value: SortOption | null) => {
      this.sortOption.set(value ?? 'nameAsc');
    });

    this.loadUnits();
  }

  private getCompanyOid(): string | undefined {
    if (this.permissionService.isRoot()) {
      const selected = this.companySelectionService.companyOid();
      return selected && selected.length > 0 ? selected : undefined;
    }
    return undefined;
  }

  private loadUnits(): void {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    const companyOid = this.getCompanyOid();

    this.unitOfMeasureService.getAllNotDeletedUnitOfMeasures(companyOid).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: ApiResponse<UnitOfMeasure[]>) => {
        this.units.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.notifications.error(this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.MESSAGES.ERROR_LOADING'));
        this.isLoading.set(false);
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(UnitOfMeasureDialogComponent, {
      width: '420px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((saved: boolean | undefined) => {
      if (saved) {
        this.loadUnits();
      }
    });
  }

  openEditDialog(unit: UnitOfMeasure): void {
    const dialogRef = this.dialog.open(UnitOfMeasureDialogComponent, {
      width: '420px',
      data: { mode: 'edit', unit }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((saved: boolean | undefined) => {
      if (saved) {
        this.loadUnits();
      }
    });
  }

  openDeleteDialog(unit: UnitOfMeasure): void {
    const dialogRef = this.dialog.open(UnitOfMeasureDeleteDialogComponent, {
      width: '360px',
      data: { unit }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((deleted: boolean | undefined) => {
      if (deleted) {
        this.loadUnits();
      }
    });
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'status-badge active' : 'status-badge inactive';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive
      ? this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.STATUS.ACTIVE')
      : this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.STATUS.INACTIVE');
  }

  onStatusToggle(unit: UnitOfMeasure, event: MatSlideToggleChange): void {
    const previousValue = unit.isActive;
    const newValue = event.checked;

    if (this.updatingIds().has(unit.id)) {
      event.source.checked = previousValue;
      return;
    }

    this.updatingIds.update((set) => {
      const nextSet = new Set(set);
      nextSet.add(unit.id);
      return nextSet;
    });

    const payload: UpdateUnitOfMeasureRequest = { isActive: newValue };

    this.unitOfMeasureService.updateUnitOfMeasure(unit.id, payload).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.units.update((units) => units.map((current) =>
          current.id === unit.id ? { ...current, isActive: newValue } : current
        ));
        this.updatingIds.update((set) => {
          const nextSet = new Set(set);
          nextSet.delete(unit.id);
          return nextSet;
        });
        this.notifications.success(this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.MESSAGES.STATUS_UPDATED'));
      },
      error: (error) => {
        event.source.checked = previousValue;
        this.updatingIds.update((set) => {
          const nextSet = new Set(set);
          nextSet.delete(unit.id);
          return nextSet;
        });
        this.notifications.error(extractApiErrorMessage(error, this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.MESSAGES.ERROR_UPDATING_STATUS')));
      }
    });
  }

  isUpdating(unitId: string): boolean {
    return this.updatingIds().has(unitId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
