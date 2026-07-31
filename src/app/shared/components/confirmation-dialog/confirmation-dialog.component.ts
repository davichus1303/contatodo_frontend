import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { I18nService } from '../../utils/i18n.util';

export interface ConfirmationDialogData {
  titleKey: string;
  messageKey: string;
  cancelKey: string;
  confirmKey: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ i18nService.translate(data.titleKey) }}</h2>
    <mat-dialog-content>
      <p>{{ i18nService.translate(data.messageKey) }}</p>
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
}
