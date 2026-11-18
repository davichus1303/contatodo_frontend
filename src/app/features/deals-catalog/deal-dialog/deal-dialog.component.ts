import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { DealsService } from '@core/application/deals/deals.service';
import { Deal } from '@core/domain/models/deal.model';
import { Product } from '@core/domain/models/product.model';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';
import { CreateDealRequest, UpdateDealRequest } from '@core/application/dto/deal-request.dto';
import { I18nService } from '@core/i18n/i18n.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { PermissionService } from '@core/application/permissions/permission.service';
import { UnitOfMeasureSelectComponent } from '@shared/components/unit-of-measure-select/unit-of-measure-select.component';
import { openConfirmationDialog } from '@shared/utils/dialog.utils';

export type DealDialogMode = 'create' | 'edit';

export interface DealDialogData {
  mode: DealDialogMode;
  deal?: Deal;
  products: readonly Product[];
  units: readonly UnitOfMeasure[];
  companyOid?: string | null;
}

type DealFormModel = {
  productOid: FormControl<string>;
  unitOfMeasureOid: FormControl<string | null>;
  quantity: FormControl<number | null>;
  price: FormControl<number | null>;
};

@Component({
  selector: 'app-deal-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    UnitOfMeasureSelectComponent
  ],
  templateUrl: './deal-dialog.component.html',
  styleUrls: ['./deal-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DealDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<DealDialogComponent>);
  private readonly data = inject<DealDialogData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly dealsService = inject(DealsService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly permissionService = inject(PermissionService);
  private readonly companySelectionService = inject(CompanySelectionService);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18nService = inject(I18nService);

  readonly mode: DealDialogMode = this.data.mode;
  readonly deal = this.data.deal;
  readonly products = [...this.data.products].sort((a, b) => a.name.localeCompare(b.name));
  readonly selectableUnits: readonly UnitOfMeasure[] = this.mode === 'create'
    ? this.data.units.filter((unit) => unit.isActive && !unit.isDeleted)
    : this.data.units;
  readonly form: FormGroup<DealFormModel>;
  readonly isSaving = signal<boolean>(false);

  constructor() {
    this.form = this.formBuilder.group({
      productOid: this.formBuilder.control(this.data.deal?.productOid ?? '', {
        validators: [Validators.required]
      }),
      unitOfMeasureOid: this.formBuilder.control<string | null>(this.data.deal?.unitOfMeasureOid ?? null, {
        validators: [Validators.required]
      }),
      quantity: this.formBuilder.control<number | null>(this.data.deal?.quantity ?? null, {
        validators: [Validators.required, Validators.min(0)]
      }),
      price: this.formBuilder.control<number | null>(this.data.deal?.price ?? null, {
        validators: [Validators.required, Validators.min(0)]
      })
    });

    if (this.mode === 'edit') {
      this.form.controls.productOid.disable();
      this.form.controls.unitOfMeasureOid.disable();
    }
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
          titleKey: 'DEALS_CATALOG.CONFIRMATION.TITLE',
          messageKey: 'DEALS_CATALOG.CONFIRMATION.MESSAGE',
          cancelKey: 'DEALS_CATALOG.CONFIRMATION.CANCEL',
          confirmKey: 'DEALS_CATALOG.CONFIRMATION.CONFIRM'
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
      const selected = this.data.companyOid ?? this.companySelectionService.companyOid();
      return selected && selected.length > 0 ? selected : undefined;
    }
    return undefined;
  }

  private save(): void {
    if (this.isSaving()) {
      return;
    }

    const quantity = Number(this.form.controls.quantity.value);
    const price = Number(this.form.controls.price.value);

    if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    if (this.mode === 'create') {
      const companyOid = this.getCompanyOid();
      const productOid = this.form.controls.productOid.value;
      const unitOfMeasureOid = this.form.controls.unitOfMeasureOid.value;

      if (!companyOid || !productOid || !unitOfMeasureOid) {
        this.isSaving.set(false);
        this.form.markAllAsTouched();
        return;
      }

      const payload: CreateDealRequest = {
        companyOid,
        productOid,
        unitOfMeasureOid,
        quantity,
        price
      };

      this.dealsService.createDeal(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notifications.success(this.i18nService.translate('DEALS_CATALOG.MESSAGES.CREATED'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.isSaving.set(false);
          this.notifications.error(extractApiErrorMessage(error, this.i18nService.translate('DEALS_CATALOG.MESSAGES.ERROR_CREATING')));
        }
      });
      return;
    }

    const dealId = this.deal?.id ?? '';
    const payload: UpdateDealRequest = { quantity, price };

    this.dealsService.updateDeal(dealId, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notifications.success(this.i18nService.translate('DEALS_CATALOG.MESSAGES.UPDATED'));
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.isSaving.set(false);
        this.notifications.error(extractApiErrorMessage(error, this.i18nService.translate('DEALS_CATALOG.MESSAGES.ERROR_UPDATING')));
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
