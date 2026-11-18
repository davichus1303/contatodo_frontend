import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { DealsService } from '@core/application/deals/deals.service';
import { Deal } from '@core/domain/models/deal.model';
import { I18nService } from '@core/i18n/i18n.service';

export interface DealDeleteDialogData {
  deal: Deal;
  productName?: string;
}

@Component({
  selector: 'app-deal-delete-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './deal-delete-dialog.component.html',
  styleUrls: ['./deal-delete-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DealDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<DealDeleteDialogComponent>);
  private readonly data = inject<DealDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly dealsService = inject(DealsService);
  private readonly notifications = inject(NotificationService);
  readonly i18nService = inject(I18nService);

  readonly deal = this.data.deal;
  readonly productName = this.data.productName ?? '';
  readonly isDeleting = signal<boolean>(false);

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);

    this.dealsService.deleteDeal(this.deal.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.notifications.success(this.i18nService.translate('DEALS_CATALOG.MESSAGES.DELETED'));
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.isDeleting.set(false);
        this.notifications.error(extractApiErrorMessage(error, this.i18nService.translate('DEALS_CATALOG.MESSAGES.ERROR_DELETING')));
      }
    });
  }
}
