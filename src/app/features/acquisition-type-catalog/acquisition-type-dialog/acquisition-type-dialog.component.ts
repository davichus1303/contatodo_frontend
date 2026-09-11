import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AcquisitionTypeService } from '@core/application/acquisition-types/acquisition-type.service';
import { CreateAcquisitionTypeRequest, UpdateAcquisitionTypeRequest } from '@core/application/dto/acquisition-type-request.dto';
import { AcquisitionType } from '@core/domain/models/acquisition-type.model';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogData } from '@shared/interfaces/confirmation-dialog.interfaces';
import { I18nService } from '@core/i18n/i18n.service';
import { nonBlank } from '@shared/validators/domain.validators';

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
  styleUrls: ['./acquisition-type-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcquisitionTypeDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AcquisitionTypeDialogComponent>);
  private readonly data = inject<AcquisitionTypeDialogData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly acquisitionTypeService = inject(AcquisitionTypeService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  readonly i18nService = inject(I18nService);
  readonly mode: AcquisitionTypeDialogMode = this.data.mode;

  readonly form: FormGroup<AcquisitionTypeFormModel>;
  readonly isSaving = signal<boolean>(false);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.form = this.formBuilder.group({
      name: this.formBuilder.control(this.data.acquisitionType?.name ?? '', {
        validators: [Validators.required, nonBlank()]
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

    if (this.isSaving()) {
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

      confirmation.afterClosed()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((confirmed: boolean | undefined) => {
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
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
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
          this.isSaving.set(false);
          this.notifications.success(this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.CREATED'));
          this.dialogRef.close(true);
        },
        error: (error: { error?: { message?: string } }) => {
          this.isSaving.set(false);
          this.notifications.error(extractApiErrorMessage(error, this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.ERROR_CREATING')));
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
        this.isSaving.set(false);
        this.notifications.success(this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.UPDATED'));
        this.dialogRef.close(true);
      },
      error: (error: { error?: { message?: string } }) => {
        this.isSaving.set(false);
        this.notifications.error(extractApiErrorMessage(error, this.i18nService.translate('ACQUISITION_TYPE_CATALOG.MESSAGES.ERROR_UPDATING')));
      }
    });
  }

  get isSubmitDisabled(): boolean {
    if (this.isSaving()) {
      return true;
    }

    if (this.mode === 'edit') {
      return this.form.invalid || !this.form.dirty;
    }

    return this.form.invalid;
  }
}
