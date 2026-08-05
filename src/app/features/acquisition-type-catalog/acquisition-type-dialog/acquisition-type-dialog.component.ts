import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AcquisitionTypeService } from '../../acquisitions/acquisition-type.service';
import { CreateAcquisitionTypeRequest, UpdateAcquisitionTypeRequest } from '../../../shared/dto/acquisition-type-request.dto';
import { AcquisitionType } from '../../../shared/models/acquisition-type.model';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { GENERAL_CONSTANTS } from '../../../shared/constants/general.constants';
import { I18nService } from '../../../shared/utils/i18n.util';

export type AcquisitionTypeDialogMode = 'create' | 'edit';

export interface AcquisitionTypeDialogData {
  mode: AcquisitionTypeDialogMode;
  acquisitionType?: AcquisitionType;
}

type AcquisitionTypeFormModel = {
  name: FormControl<string>;
  description: FormControl<string>;
  affectsInventory: FormControl<boolean>;
};

@Component({
  selector: 'app-acquisition-type-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule
  ],
  templateUrl: './acquisition-type-dialog.component.html',
  styleUrls: ['./acquisition-type-dialog.component.scss']
})
export class AcquisitionTypeDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AcquisitionTypeDialogComponent>);
  private readonly data = inject<AcquisitionTypeDialogData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly acquisitionTypeService = inject(AcquisitionTypeService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  readonly i18nService = inject(I18nService);
  readonly mode: AcquisitionTypeDialogMode = this.data.mode;

  readonly form: FormGroup<AcquisitionTypeFormModel>;
  isSaving = false;

  constructor() {
    this.form = this.formBuilder.group({
      name: this.formBuilder.control(this.data.acquisitionType?.name ?? '', {
        validators: [Validators.required, this.noWhitespaceValidator]
      }),
      description: this.formBuilder.control(this.data.acquisitionType?.description ?? ''),
      affectsInventory: this.formBuilder.control(
        this.data.acquisitionType?.affectsInventory ?? false
      )
    });
  }

  /**
   * Closes the dialog without saving changes.
   */
  cancel(): void {
    this.dialogRef.close();
  }

  /**
   * Validates form and triggers create/update flow.
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isSaving) {
      return;
    }

    if (this.mode === 'edit') {
      const dialogData: ConfirmationDialogData = {
        titleKey: 'ACQUISITION_TYPE_CATALOG.CONFIRMATION.TITLE',
        messageKey: 'ACQUISITION_TYPE_CATALOG.CONFIRMATION.MESSAGE',
        cancelKey: 'ACQUISITION_TYPE_CATALOG.CONFIRMATION.CANCEL',
        confirmKey: 'ACQUISITION_TYPE_CATALOG.CONFIRMATION.CONFIRM'
      };

      const confirmation = this.dialog.open(ConfirmationDialogComponent, {
        width: '320px',
        data: dialogData
      });

      confirmation.afterClosed().subscribe((confirmed: boolean | undefined) => {
        if (confirmed) {
          this.save();
        }
      });
      return;
    }

    this.save();
  }

  /**
   * Executes the create/update request.
   */
  private save(): void {
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;
    const name = this.form.controls.name.value.trim();
    const description = this.form.controls.description.value.trim();
    const descriptionValue = description.length > 0 ? description : undefined;
    const affectsInventory = this.form.controls.affectsInventory.value;

    if (this.mode === 'create') {
      const payload: CreateAcquisitionTypeRequest = {
        name,
        description: descriptionValue,
        affectsInventory
      };

      this.acquisitionTypeService.createAcquisitionType(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.snackBar.open(
            this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.CREATED'),
            GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
            { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
          );
          this.dialogRef.close(true);
        },
        error: (error: { error?: { message?: string } }) => {
          this.isSaving = false;
          this.snackBar.open(
            error.error?.message ?? this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.ERROR_CREATING'),
            GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
            { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
          );
        }
      });
      return;
    }

    const acquisitionTypeId = this.data.acquisitionType?.id ?? '';
    const payload: UpdateAcquisitionTypeRequest = {
      name,
      description: descriptionValue,
      affectsInventory
    };

    this.acquisitionTypeService.updateAcquisitionType(acquisitionTypeId, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open(
          this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.UPDATED'),
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
        this.dialogRef.close(true);
      },
      error: (error: { error?: { message?: string } }) => {
        this.isSaving = false;
        this.snackBar.open(
          error.error?.message ?? this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.ERROR_UPDATING'),
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
      }
    });
  }

  /**
   * Validator that checks if the input value consists solely of whitespace.
   * Returns a validation error object if the trimmed value is empty, otherwise null.
   * @param control - The form control to validate, which contains a string value.
   * @returns A ValidationErrors object with a 'whitespace' property if invalid, null otherwise.
   */
  private noWhitespaceValidator(control: AbstractControl<string>): ValidationErrors | null {
    const value = control.value ?? '';
    return value.trim().length === 0 ? { whitespace: true } : null;
  }

  get isSubmitDisabled(): boolean {
    if (this.isSaving) {
      return true;
    }

    if (this.mode === 'edit') {
      return this.form.invalid || !this.form.dirty;
    }

    return this.form.invalid;
  }
}
