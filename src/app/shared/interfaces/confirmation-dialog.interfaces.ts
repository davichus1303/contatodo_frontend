/**
 * Input payload for the shared confirmation dialog.
 */
export interface ConfirmationDialogData {
  titleKey: string;
  messageKey: string;
  cancelKey: string;
  confirmKey: string;
  messageParams?: Record<string, string>;
}
