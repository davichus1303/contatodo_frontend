import { ChangeDetectionStrategy, Component, computed, DestroyRef, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Product } from '@core/domain/models/product.model';
import { PRODUCT_DESCRIPTION_MAX_LENGTH, PRODUCT_NAME_MAX_LENGTH } from '@core/domain/models/product.model';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';
import { ProductFormPayload } from '@core/application/dto/product-request.dto';
import { UnitOfMeasureCatalogService } from '@core/application/unit-of-measures/unit-of-measure-catalog.service';
import { UnitOfMeasureSelectComponent } from '@shared/components/unit-of-measure-select/unit-of-measure-select.component';
import { I18nService } from '@core/i18n/i18n.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    UnitOfMeasureSelectComponent
  ],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductFormComponent implements OnInit, OnChanges {
  @Input() product: Product | null = null;
  @Input() isEdit = false;
  @Input() companyOid?: string;
  @Output() formSubmit = new EventEmitter<ProductFormPayload>();

  readonly form = signal<FormGroup | null>(null);
  readonly isEditMode = signal<boolean>(false);
  readonly units = signal<readonly UnitOfMeasure[]>([]);
  readonly selectedUnitOids = signal<readonly string[]>([]);

  /**
   * Whether the current selection includes a unit flagged as a pack.
   *
   * <p>Pack size is only meaningful for products sold by packs, so the field
   * is shown and required only in that case.</p>
   */
  readonly hasPackUnitSelected = computed(() => {
    const selected = this.selectedUnitOids();
    return selected.length > 0 && this.units().some((unit) => unit.isPack && selected.includes(unit.id));
  });

  private readonly destroyRef = inject(DestroyRef);

  private readonly dialogRef = inject(MatDialogRef<ProductFormComponent>);
  private readonly unitOfMeasureCatalog = inject(UnitOfMeasureCatalogService);
  private readonly dialogData = inject(MAT_DIALOG_DATA, { optional: true }) as {
    product?: Product | null;
    isEdit?: boolean;
    companyOid?: string;
  } | null;

  constructor(
    private readonly formBuilder: FormBuilder,
    readonly i18nService: I18nService
  ) {}

  ngOnInit(): void {
    this.syncInputsFromDialogData();
    this.buildForm();
    this.loadUnits();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] || changes['isEdit']) {
      this.buildForm();
    }
  }

  private syncInputsFromDialogData(): void {
    if (!this.dialogData) {
      return;
    }

    this.product = this.dialogData.product ?? this.product;
    this.isEdit = this.dialogData.isEdit ?? this.isEdit;
    this.companyOid = this.dialogData.companyOid ?? this.companyOid;
  }

  private buildForm(): void {
    this.isEditMode.set(this.isEdit);
    const unitValidators = this.isEdit ? [] : [Validators.required];
    const form = this.formBuilder.group({
      name: [this.product?.name ?? '', [Validators.required, Validators.maxLength(PRODUCT_NAME_MAX_LENGTH)]],
      description: [this.product?.description ?? '', [Validators.required, Validators.maxLength(PRODUCT_DESCRIPTION_MAX_LENGTH)]],
      unitOfMeasures: [this.product?.unitOfMeasures ?? [], unitValidators],
      packSize: [this.product?.packSize ?? null],
      stock: [this.product?.stock ?? 0, [Validators.required, Validators.min(0)]],
      realCost: [this.product?.realCost ?? 0, [Validators.required, Validators.min(0)]],
      unitRealCost: [this.product?.unitRealCost ?? 0, [Validators.required, Validators.min(0)]],
      unitPublicCost: [this.product?.unitPublicCost ?? 0, [Validators.required, Validators.min(0)]],
    });

    this.form.set(form);
    this.syncPackSizeState(form);
    form.controls['unitOfMeasures'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPackSizeState(form));
  }

  /**
   * Keeps the pack size control in sync with the selected units.
   *
   * <p>When at least one selected unit is a pack, the pack size becomes
   * required and must be a positive integer. Otherwise the validators are
   * removed because the field does not apply.</p>
   *
   * @param form Form whose pack size control must be synchronized.
   */
  private syncPackSizeState(form: FormGroup): void {
    const selected = form.controls['unitOfMeasures'].value;
    this.selectedUnitOids.set(Array.isArray(selected) ? selected : []);

    const packSizeControl = form.controls['packSize'];
    if (this.hasPackUnitSelected()) {
      packSizeControl.setValidators([Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]);
    } else {
      packSizeControl.clearValidators();
    }
    packSizeControl.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Loads the active units of measure offered by the selector.
   */
  private loadUnits(): void {
    this.unitOfMeasureCatalog.getActiveUnits(this.companyOid).subscribe({
      next: (units) => {
        this.units.set(units);
        const form = this.form();
        if (form) {
          this.syncPackSizeState(form);
        }
      },
      error: () => this.units.set([])
    });
  }

  submit(): void {
    const form = this.form();
    if (!form || form.invalid) {
      form?.markAllAsTouched();
      return;
    }

    const payload: ProductFormPayload = {
      name: form.value.name,
      description: form.value.description,
      unitOfMeasures: [...(form.value.unitOfMeasures ?? [])],
      stock: Number(form.value.stock),
      realCost: Number(form.value.realCost),
      unitRealCost: Number(form.value.unitRealCost),
      unitPublicCost: Number(form.value.unitPublicCost)
    };

    if (this.hasPackUnitSelected()) {
      payload.packSize = Number(form.value.packSize);
    }

    this.formSubmit.emit(payload);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  get formGroup(): FormGroup | null {
    return this.form();
  }

  get title(): string {
    return this.isEdit
      ? this.i18nService.translate('PRODUCTS.MODAL.EDIT_TITLE')
      : this.i18nService.translate('PRODUCTS.MODAL.CREATE_TITLE');
  }

  get submitLabel(): string {
    return this.isEdit
      ? this.i18nService.translate('PRODUCTS.FORM.SAVE_CHANGES')
      : this.i18nService.translate('PRODUCTS.FORM.CREATE');
  }

  get isSubmitDisabled(): boolean {
    const form = this.form();
    if (!form) {
      return true;
    }

    return form.invalid || (this.isEdit && !form.dirty);
  }
}
