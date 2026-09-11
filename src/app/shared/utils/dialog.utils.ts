import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogData } from '@shared/interfaces/confirmation-dialog.interfaces';

/**
 * Opens the shared confirmation dialog with the given payload.
 *
 * @param dialog MatDialog service.
 * @param data Confirmation dialog payload.
 * @param width Dialog width (defaults to '420px').
 * @returns Reference to the opened dialog.
 */
export function openConfirmationDialog(
  dialog: MatDialog,
  data: ConfirmationDialogData,
  width = '420px'
): MatDialogRef<ConfirmationDialogComponent, boolean> {
  return dialog.open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(
    ConfirmationDialogComponent,
    { width, data }
  );
}
