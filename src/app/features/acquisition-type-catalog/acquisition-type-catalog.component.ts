import { Component, inject, signal, computed, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AcquisitionTypeService } from '../acquisitions/acquisition-type.service';
import { AcquisitionType } from '../../shared/models/acquisition-type.model';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { GENERAL_CONSTANTS } from '../../shared/constants/general.constants';
import { I18nService } from '../../shared/utils/i18n.util';
import { AcquisitionTypeDialogComponent } from './acquisition-type-dialog/acquisition-type-dialog.component';
import { AcquisitionTypeDeleteDialogComponent } from './acquisition-type-delete-dialog/acquisition-type-delete-dialog.component';
import { UpdateAcquisitionTypeRequest } from '../../shared/dto/acquisition-type-request.dto';

export type SortOption = 'nameAsc' | 'nameDesc' | 'activeFirst' | 'inactiveFirst';

@Component({
  selector: 'app-acquisition-type-catalog',
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
    MatSlideToggleModule
  ],
  templateUrl: './acquisition-type-catalog.component.html',
  styleUrls: ['./acquisition-type-catalog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcquisitionTypeCatalogComponent implements OnDestroy {
  private readonly acquisitionTypeService = inject(AcquisitionTypeService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  readonly i18nService = inject(I18nService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl<string>('');
  readonly sortControl = new FormControl<SortOption>('nameAsc');
  readonly searchTerm = signal<string>('');
  readonly sortOption = signal<SortOption>('nameAsc');
  readonly acquisitionTypes = signal<AcquisitionType[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly updatingIds = signal<Set<string>>(new Set());

  readonly filteredAcquisitionTypes = computed(() => {
    const searchTerm = this.searchTerm().toLowerCase();
    const sortOption = this.sortOption();
    
    const filtered = this.acquisitionTypes().filter(type =>
      type.name.toLowerCase().includes(searchTerm)
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
    { value: 'nameAsc', labelKey: 'ACQUISITION_TYPE_CATALOG.SORT.OPTIONS.NAME_ASC' },
    { value: 'nameDesc', labelKey: 'ACQUISITION_TYPE_CATALOG.SORT.OPTIONS.NAME_DESC' },
    { value: 'activeFirst', labelKey: 'ACQUISITION_TYPE_CATALOG.SORT.OPTIONS.ACTIVE_FIRST' },
    { value: 'inactiveFirst', labelKey: 'ACQUISITION_TYPE_CATALOG.SORT.OPTIONS.INACTIVE_FIRST' }
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

    this.loadAcquisitionTypes();
  }

  /**
   * Loads acquisition types from the backend.
   */
  private loadAcquisitionTypes(): void {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);

    this.acquisitionTypeService.getAllNotDeletedAcquisitionTypes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: ApiResponse<AcquisitionType[]>) => {
        this.acquisitionTypes.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open(
          this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.ERROR_LOADING'),
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Opens the modal dialog to create a new acquisition type.
   */
  openCreateDialog(): void {
    const dialogRef = this.dialog.open(AcquisitionTypeDialogComponent, {
      width: '420px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((saved: boolean | undefined) => {
      if (saved) {
        this.loadAcquisitionTypes();
      }
    });
  }

  /**
   * Opens the modal dialog to edit an existing acquisition type.
   *
   * @param acquisitionType Selected acquisition type.
   */
  openEditDialog(acquisitionType: AcquisitionType): void {
    const dialogRef = this.dialog.open(AcquisitionTypeDialogComponent, {
      width: '420px',
      data: { mode: 'edit', acquisitionType }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((saved: boolean | undefined) => {
      if (saved) {
        this.loadAcquisitionTypes();
      }
    });
  }

  /**
   * Opens the confirmation dialog to delete an acquisition type.
   *
   * @param acquisitionType Selected acquisition type.
   */
  openDeleteDialog(acquisitionType: AcquisitionType): void {
    const dialogRef = this.dialog.open(AcquisitionTypeDeleteDialogComponent, {
      width: '360px',
      data: { acquisitionType }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((deleted: boolean | undefined) => {
      if (deleted) {
        this.loadAcquisitionTypes();
      }
    });
  }

  /**
   * Gets the status badge class based on active status.
   *
   * @param isActive Active status.
   * @returns CSS class for the badge.
   */
  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'status-badge active' : 'status-badge inactive';
  }

  /**
   * Checks if an acquisition type is currently being updated.
   *
   * @param id Acquisition type ID.
   * @returns True if updating, false otherwise.
   */
  isUpdating(id: string): boolean {
    return this.updatingIds().has(id);
  }

  /**
   * Handles the toggle change event for activation/deactivation.
   *
   * @param acquisitionType The acquisition type being toggled.
   * @param event The change event.
   */
  onToggleChange(acquisitionType: AcquisitionType, event: MatSlideToggleChange): void {
    const originalState = acquisitionType.isActive;
    
    const title = acquisitionType.isActive
      ? this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.CONFIRM_DEACTIVATE_TITLE')
      : this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.CONFIRM_ACTIVATE_TITLE');
    
    const message = acquisitionType.isActive
      ? this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.CONFIRM_DEACTIVATE_MESSAGE')
      : this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.CONFIRM_ACTIVATE_MESSAGE');

    const dialogRef = this.dialog.open(AcquisitionTypeDeleteDialogComponent, {
      width: '360px',
      data: {
        title: title,
        message: message,
        confirmText: this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.CONFIRM'),
        cancelText: this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.CANCEL')
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.updateAcquisitionTypeStatus(acquisitionType);
      } else {
        this.loadAcquisitionTypes();
      }
    });
  }

  /**
   * Updates the acquisition type status (activate/deactivate).
   *
   * @param acquisitionType The acquisition type to update.
   */
  private updateAcquisitionTypeStatus(acquisitionType: AcquisitionType): void {
    const newStatus = !acquisitionType.isActive;
    
    this.updatingIds.update(ids => new Set(ids).add(acquisitionType.id));

    const updateRequest: UpdateAcquisitionTypeRequest = {
      name: acquisitionType.name,
      description: acquisitionType.description,
      isActive: newStatus
    };

    this.acquisitionTypeService.updateAcquisitionType(acquisitionType.id, updateRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: ApiResponse<AcquisitionType>) => {
        this.snackBar.open(
          response.message || this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.UPDATE_SUCCESS'),
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
        
        this.updatingIds.update(ids => {
          const newSet = new Set(ids);
          newSet.delete(acquisitionType.id);
          return newSet;
        });
        
        this.loadAcquisitionTypes();
      },
      error: (error) => {
        this.snackBar.open(
          error.error?.message || this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.UPDATE_ERROR'),
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
        
        this.updatingIds.update(ids => {
          const newSet = new Set(ids);
          newSet.delete(acquisitionType.id);
          return newSet;
        });
      }
    });
  }

  /**
   * Cleanup on component destroy.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
