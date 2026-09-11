import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { I18nService } from '@core/i18n/i18n.service';
import { ConfirmationDialogData } from '@shared/interfaces/confirmation-dialog.interfaces';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ i18nService.translate(data.titleKey) }}</h2>
    <mat-dialog-content>
      <p>{{ resolvedMessage }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ i18nService.translate(data.cancelKey) }}</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="true">{{ i18nService.translate(data.confirmKey) }}</button>
    </mat-dialog-actions>
  `
})
export class ConfirmationDialogComponent {
  readonly i18nService = inject(I18nService);
  readonly data = inject<ConfirmationDialogData>(MAT_DIALOG_DATA);

  readonly resolvedMessage = this.resolveMessage();

  private resolveMessage(): string {
    const base = this.i18nService.translate(this.data.messageKey);
    const params = this.data.messageParams;

    if (!params) {
      return base;
    }

    return Object.entries(params).reduce(
      (acc, [key, value]) => acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value),
      base
    );
  }
}