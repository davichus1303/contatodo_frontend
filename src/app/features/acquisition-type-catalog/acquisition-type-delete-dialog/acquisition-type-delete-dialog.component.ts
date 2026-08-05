import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AcquisitionTypeService } from '../../acquisitions/acquisition-type.service';
import { ApiResponse } from '../../../shared/interfaces/api-response.interface';
import { AcquisitionType } from '../../../shared/models/acquisition-type.model';
import { GENERAL_CONSTANTS } from '../../../shared/constants/general.constants';
import { I18nService } from '../../../shared/utils/i18n.util';

export interface AcquisitionTypeDeleteDialogData {
  acquisitionType?: AcquisitionType;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-acquisition-type-delete-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './acquisition-type-delete-dialog.component.html',
  styleUrls: ['./acquisition-type-delete-dialog.component.scss']
})
export class AcquisitionTypeDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AcquisitionTypeDeleteDialogComponent>);
  private readonly data = inject<AcquisitionTypeDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly acquisitionTypeService = inject(AcquisitionTypeService);
  private readonly snackBar = inject(MatSnackBar);
  readonly i18nService = inject(I18nService);

  isDeleting = false;

  get title(): string {
    return this.data.title ?? this.i18nService.translate('ACQUISITION_TYPE_CATALOG.DELETE.TITLE');
  }

  get message(): string {
    return this.data.message ?? (this.data.acquisitionType 
      ? this.i18nService.translate('ACQUISITION_TYPE_CATALOG.DELETE.MESSAGE')
      : '');
  }

  get confirmText(): string {
    return this.data.confirmText ?? this.i18nService.translate('ACQUISITION_TYPE_CATALOG.DELETE.CONFIRM');
  }

  get cancelText(): string {
    return this.data.cancelText ?? this.i18nService.translate('ACQUISITION_TYPE_CATALOG.DELETE.CANCEL');
  }

  get isDeleteMode(): boolean {
    return !!this.data.acquisitionType;
  }

  /**
   * Closes the dialog without deleting.
   */
  cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * Calls the backend endpoint to delete the acquisition type (only in delete mode).
   */
  confirmDelete(): void {
    if (!this.isDeleteMode) {
      this.dialogRef.close(true);
      return;
    }

    if (this.isDeleting || !this.data.acquisitionType) {
      return;
    }

    this.isDeleting = true;
    this.acquisitionTypeService.deleteAcquisitionType(this.data.acquisitionType.id).subscribe({
      next: (response: ApiResponse<AcquisitionType>) => {
        this.isDeleting = false;
        this.snackBar.open(
          response.message,
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
        this.dialogRef.close(true);
      },
      error: (error: { error?: { message?: string } }) => {
        this.isDeleting = false;
        this.snackBar.open(
          error.error?.message ?? this.i18nService.translate('ACQUISITION_TYPE_CATALOG.DELETE.ERROR'),
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
      }
    });
  }
}

