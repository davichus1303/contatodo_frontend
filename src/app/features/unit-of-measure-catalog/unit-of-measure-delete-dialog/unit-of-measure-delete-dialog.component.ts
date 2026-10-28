import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { UnitOfMeasureService } from '@core/application/unit-of-measures/unit-of-measure.service';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';
import { I18nService } from '@core/i18n/i18n.service';

export interface UnitOfMeasureDeleteDialogData {
  unit: UnitOfMeasure;
}

@Component({
  selector: 'app-unit-of-measure-delete-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './unit-of-measure-delete-dialog.component.html',
  styleUrls: ['./unit-of-measure-delete-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnitOfMeasureDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UnitOfMeasureDeleteDialogComponent>);
  private readonly data = inject<UnitOfMeasureDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly unitOfMeasureService = inject(UnitOfMeasureService);
  private readonly notifications = inject(NotificationService);
  readonly i18nService = inject(I18nService);

  readonly unit = this.data.unit;
  readonly isDeleting = signal<boolean>(false);

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);

    this.unitOfMeasureService.deleteUnitOfMeasure(this.unit.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.notifications.success(this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.MESSAGES.DELETED'));
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.isDeleting.set(false);
        this.notifications.error(extractApiErrorMessage(error, this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.MESSAGES.ERROR_DELETING')));
      }
    });
  }
}
