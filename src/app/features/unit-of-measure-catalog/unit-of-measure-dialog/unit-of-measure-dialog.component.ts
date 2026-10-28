import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UnitOfMeasureService } from '@core/application/unit-of-measures/unit-of-measure.service';
import { CreateUnitOfMeasureRequest, UpdateUnitOfMeasureRequest } from '@core/application/dto/unit-of-measure-request.dto';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';
import { I18nService } from '@core/i18n/i18n.service';
import { nonBlank } from '@shared/validators/domain.validators';
import { openConfirmationDialog } from '@shared/utils/dialog.utils';
import { PermissionService } from '@core/application/permissions/permission.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';

export type UnitOfMeasureDialogMode = 'create' | 'edit';

export interface UnitOfMeasureDialogData {
  mode: UnitOfMeasureDialogMode;
  unit?: UnitOfMeasure;
}

type UnitOfMeasureFormModel = {
  name: FormControl<string>;
  abrev: FormControl<string>;
};

@Component({
  selector: 'app-unit-of-measure-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './unit-of-measure-dialog.component.html',
  styleUrls: ['./unit-of-measure-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnitOfMeasureDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UnitOfMeasureDialogComponent>);
  private readonly data = inject<UnitOfMeasureDialogData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly unitOfMeasureService = inject(UnitOfMeasureService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  readonly i18nService = inject(I18nService);
  readonly mode: UnitOfMeasureDialogMode = this.data.mode;
  private readonly permissionService = inject(PermissionService);
  private readonly companySelectionService = inject(CompanySelectionService);

  readonly form: FormGroup<UnitOfMeasureFormModel>;
  readonly isSaving = signal<boolean>(false);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.form = this.formBuilder.group({
      name: this.formBuilder.control(this.data.unit?.name ?? '', {
        validators: [Validators.required, nonBlank()]
      }),
      abrev: this.formBuilder.control(this.data.unit?.abrev ?? '', {
        validators: [Validators.required, nonBlank()]
      })
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isSaving()) {
      return;
    }

    if (this.mode === 'edit') {
      const confirmation = openConfirmationDialog(
        this.dialog,
        {
          titleKey: 'UNIT_OF_MEASURE_CATALOG.CONFIRMATION.TITLE',
          messageKey: 'UNIT_OF_MEASURE_CATALOG.CONFIRMATION.MESSAGE',
          cancelKey: 'UNIT_OF_MEASURE_CATALOG.CONFIRMATION.CANCEL',
          confirmKey: 'UNIT_OF_MEASURE_CATALOG.CONFIRMATION.CONFIRM'
        },
        '320px'
      );

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

  private getCompanyOid(): string | undefined {
    if (this.permissionService.isRoot()) {
      const selected = this.companySelectionService.companyOid();
      return selected && selected.length > 0 ? selected : undefined;
    }
    return undefined;
  }

  private save(): void {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    const name = this.form.controls.name.value.trim();
    const abrev = this.form.controls.abrev.value.trim();

    if (this.mode === 'create') {
      const payload: CreateUnitOfMeasureRequest = {
        name,
        abrev,
        companyOid: this.getCompanyOid()
      };

      this.unitOfMeasureService.createUnitOfMeasure(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notifications.success(this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.MESSAGES.CREATED'));
          this.dialogRef.close(true);
        },
        error: (error: { error?: { message?: string } }) => {
          this.isSaving.set(false);
          this.notifications.error(extractApiErrorMessage(error, this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.MESSAGES.ERROR_CREATING')));
        }
      });
      return;
    }

    const unitId = this.data.unit?.id ?? '';
    const payload: UpdateUnitOfMeasureRequest = {
      name,
      abrev
    };

    this.unitOfMeasureService.updateUnitOfMeasure(unitId, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notifications.success(this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.MESSAGES.UPDATED'));
        this.dialogRef.close(true);
      },
      error: (error: { error?: { message?: string } }) => {
        this.isSaving.set(false);
        this.notifications.error(extractApiErrorMessage(error, this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.MESSAGES.ERROR_UPDATING')));
      }
    });
  }

  get isSubmitDisabled(): boolean {
    if (this.isSaving()) {
      return true;
    }
    return this.form.invalid;
  }
}
