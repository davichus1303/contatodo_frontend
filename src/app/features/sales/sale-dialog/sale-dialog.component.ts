import { ChangeDetectionStrategy, Component, DestroyRef, Inject, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SalesService } from '@core/application/sales/sales.service';
import { UnitOfMeasureCatalogService } from '@core/application/unit-of-measures/unit-of-measure-catalog.service';
import { Product } from '@core/domain/models/product.model';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';
import { CreateSaleRequest } from '@core/application/dto/create-sale-request.dto';
import { UnitOfMeasureSelectComponent } from '@shared/components/unit-of-measure-select/unit-of-measure-select.component';
import { SALES_CONSTANTS } from '@shared/constants/sales.constants';
import { formatCurrency as formatCurrencyUtil } from '@shared/utils/format.utils';
import { calculateProfit as calculateProfitUtil } from '../sales.utils';
import { I18nService } from '@core/i18n/i18n.service';

/**
 * Converts a quantity expressed in the selected unit into base units.
 *
 * <p>Pack units multiply the quantity by the product pack size; every other
 * unit is already expressed in base units. Non-positive quantities collapse to
 * zero so the derived cost never becomes negative.</p>
 *
 * @param quantity Quantity in the selected unit.
 * @param unit Selected unit of measure, or null while the catalog loads.
 * @param packSize Base units per pack, or null when the product has none.
 * @returns Quantity in base units.
 */
function toBaseQuantity(
  quantity: number,
  unit: UnitOfMeasure | null,
  packSize: number | null
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 0;
  }

  if (unit?.isPack === true && packSize !== null) {
    return quantity * packSize;
  }

  return quantity;
}

/**
 * Maximum quantity that can be sold in the selected unit.
 *
 * <p>Stock is stored in base units, so a pack unit can only sell as many packs
 * as fit entirely in the available stock.</p>
 *
 * @param stock Available stock in base units.
 * @param unit Selected unit of measure, or null while the catalog loads.
 * @param packSize Base units per pack, or null when the product has none.
 * @returns Maximum sellable quantity in the selected unit.
 */
function maxSellableQuantity(
  stock: number,
  unit: UnitOfMeasure | null,
  packSize: number | null
): number {
  const available = Number.isFinite(stock) && stock > 0 ? stock : 0;

  if (unit?.isPack === true && packSize !== null) {
    return Math.floor(available / packSize);
  }

  return available;
}

/**
 * Cross-field validator mirroring the backend profit invariant.
 *
 * The backend rejects a sale whose total price does not strictly exceed the
 * total cost with a `SaleWithoutProfitException` (HTTP 400), so the rule is
 * enforced here to keep an impossible sale from ever leaving the browser.
 *
 * Incomplete input is left to the per-control `required`/`min` validators: the
 * rule only judges a fully filled, positive form.
 *
 * @param product Product being sold, source of the unit real cost.
 * @param baseQuantity Resolves the sold quantity in base units.
 * @returns Group validator flagging a non-profitable price.
 */
function saleMustGenerateProfit(
  product: Product,
  baseQuantity: (control: AbstractControl) => number
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const quantity = Number(control.get('quantity')?.value ?? 0);
    const totalSalePrice = Number(control.get('totalSalePrice')?.value ?? 0);
    const unitRealCost = Number(product.unitRealCost ?? 0);

    if (quantity <= 0 || totalSalePrice <= 0) {
      return null;
    }

    return totalSalePrice > unitRealCost * baseQuantity(control) ? null : { saleWithoutProfit: true };
  };
}

/**
 * Validator that keeps the sold quantity within available stock.
 *
 * <p>It lives on the quantity control so the form field can surface the error
 * and the message stays visible when the selected unit changes.</p>
 *
 * @param maxQuantity Resolves the maximum sellable quantity in the selected unit.
 * @returns Control validator flagging an over-stock sale.
 */
function saleQuantityWithinStock(maxQuantity: () => number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const quantity = Number(control.value ?? 0);

    if (quantity <= 0) {
      return null;
    }

    return quantity <= maxQuantity() ? null : { insufficientStock: true };
  };
}

/**
 * Data handed to the dialog by the sales page.
 */
export interface SaleDialogData {
  /** Product being sold. */
  readonly product: Product;
  /**
   * Company the sale belongs to.
   *
   * Present only when a root session picked a company explicitly; a
   * session-scoped sale leaves it `null` so the backend uses its own
   * company claim.
   */
  readonly companyOid: string | null;
}

/**
 * Dialog component for creating a sale.
 *
 * <p>The unit of measure is preselected from the product catalog: the units
 * declared by the product are offered, falling back to the full active catalog
 * when the product declares none. When several units are available the first
 * non-pack unit is selected by default, matching how the backend stores stock
 * in base units.</p>
 */
@Component({
  selector: 'app-sale-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    UnitOfMeasureSelectComponent
  ],
  templateUrl: './sale-dialog.component.html',
  styleUrls: ['./sale-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SaleDialogComponent {
  saleForm: FormGroup;
  readonly isLoading = signal<boolean>(false);
  readonly units = signal<readonly UnitOfMeasure[]>([]);
  readonly selectedUnitOid = signal<string | null>(null);
  readonly quantityValue = signal<number>(1);
  readonly totalSalePriceValue = signal<number>(0);
  readonly i18nService = inject(I18nService);

  /** Active units indexed by identifier. */
  readonly unitsById = computed<ReadonlyMap<string, UnitOfMeasure>>(
    () => new Map(this.units().map(unit => [unit.id, unit] as const))
  );

  /**
   * Units offered by the selector.
   *
   * <p>Only the units declared by the product are offered; when it declares
   * none, or none of them resolves to an active unit, the full active catalog
   * is offered instead.</p>
   */
  readonly availableUnits = computed<readonly UnitOfMeasure[]>(() => {
    const declared = this.data.product.unitOfMeasures ?? [];

    if (declared.length === 0) {
      return this.sortedActiveUnits();
    }

    const resolved = declared
      .map(oid => this.unitsById().get(oid))
      .filter((unit): unit is UnitOfMeasure => unit !== undefined);

    return resolved.length > 0 ? this.sortUnits(resolved) : this.sortedActiveUnits();
  });

  /** Unit currently selected to register the sale. */
  readonly selectedUnit = computed<UnitOfMeasure | null>(() => {
    const oid = this.selectedUnitOid();
    return oid ? this.unitsById().get(oid) ?? null : null;
  });

  /** Whether the sale is registered in a pack unit. */
  readonly isPackSelected = computed(() => this.selectedUnit()?.isPack === true);

  /** Pack size stored in the product, when it is a positive integer. */
  readonly effectivePackSize = computed<number | null>(() => {
    const packSize = this.data.product.packSize;
    return typeof packSize === 'number' && Number.isInteger(packSize) && packSize > 0
      ? packSize
      : null;
  });

  /** Sold quantity expressed in base units. */
  readonly baseQuantity = computed<number>(
    () => toBaseQuantity(this.quantityValue(), this.selectedUnit(), this.effectivePackSize())
  );

  /** Maximum quantity that can be sold in the selected unit. */
  readonly maxQuantity = computed<number>(
    () => maxSellableQuantity(this.data.product.stock, this.selectedUnit(), this.effectivePackSize())
  );

  /** Total cost of the sale, calculated over base units. */
  readonly totalCost = computed<number>(() => this.data.product.unitRealCost * this.baseQuantity());

  /** Gross profit of the sale. */
  readonly profit = computed<number>(
    () => calculateProfitUtil(this.totalSalePriceValue(), this.totalCost())
  );

  constructor(
    private dialogRef: MatDialogRef<SaleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SaleDialogData,
    private fb: FormBuilder,
    private salesService: SalesService,
    private unitOfMeasureCatalog: UnitOfMeasureCatalogService,
    private notifications: NotificationService,
    private destroyRef: DestroyRef
  ) {
    this.saleForm = this.fb.group({
      unitOfMeasureOid: [null, [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      totalSalePrice: ['', [Validators.required, Validators.min(0)]],
      notes: ['']
    });

    this.saleForm.setValidators([
      saleMustGenerateProfit(this.data.product, control => this.baseQuantityFor(control))
    ]);

    const quantityControl = this.saleForm.get('quantity');
    quantityControl?.addValidators(saleQuantityWithinStock(() => this.maxQuantityForForm()));
    this.saleForm.updateValueAndValidity({ emitEvent: false });
    quantityControl?.updateValueAndValidity({ emitEvent: false });

    this.saleForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.quantityValue.set(Number(value.quantity ?? 0));
        this.totalSalePriceValue.set(Number(value.totalSalePrice ?? 0));
        this.selectedUnitOid.set(
          typeof value.unitOfMeasureOid === 'string' && value.unitOfMeasureOid.length > 0
            ? value.unitOfMeasureOid
            : null
        );
        quantityControl?.updateValueAndValidity({ emitEvent: false });
      });

    this.loadUnits();
  }

  /**
   * Loads the active units of measure of the sale company.
   */
  private loadUnits(): void {
    this.unitOfMeasureCatalog.getActiveUnits(this.data.companyOid ?? undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (units: UnitOfMeasure[]) => {
          this.units.set(units);
          this.applyDefaultUnit();
        },
        error: () => {
          this.units.set([]);
          this.notifications.error(SALES_CONSTANTS.MESSAGES.ERROR_LOADING_UNITS);
        }
      });
  }

  /**
   * Preselects the unit of measure used by the sale.
   *
   * <p>The first non-pack unit is preferred because stock is stored in base
   * units; when every option is a pack, the first one is selected. A selection
   * that is no longer offered is replaced.</p>
   */
  private applyDefaultUnit(): void {
    const available = this.availableUnits();
    const control = this.saleForm.get('unitOfMeasureOid');
    const current = control?.value;

    if (typeof current === 'string' && available.some(unit => unit.id === current)) {
      return;
    }

    const preferred = available.find(unit => !unit.isPack) ?? available[0] ?? null;
    control?.setValue(preferred?.id ?? null);
  }

  /**
   * Resolves the sold quantity in base units from the current form state.
   *
   * @param control Form group being validated.
   * @returns Quantity in base units.
   */
  private baseQuantityFor(control: AbstractControl): number {
    const quantity = Number(control.get('quantity')?.value ?? 0);
    return toBaseQuantity(quantity, this.selectedUnitFor(control), this.effectivePackSize());
  }

  /**
   * Resolves the maximum sellable quantity from the current form state.
   *
   * @returns Maximum quantity in the selected unit.
   */
  private maxQuantityForForm(): number {
    const oid = this.saleForm.get('unitOfMeasureOid')?.value;
    const unit = typeof oid === 'string' ? this.unitsById().get(oid) ?? null : null;
    return maxSellableQuantity(this.data.product.stock, unit, this.effectivePackSize());
  }

  /**
   * Resolves the unit selected in the form group.
   *
   * @param control Form group being validated.
   * @returns Selected unit, or null when it is not set or not in the catalog.
   */
  private selectedUnitFor(control: AbstractControl): UnitOfMeasure | null {
    const oid = control.get('unitOfMeasureOid')?.value;
    return typeof oid === 'string' ? this.unitsById().get(oid) ?? null : null;
  }

  /**
   * Active units sorted by name for a stable presentation.
   *
   * @returns Sorted copy of the active units.
   */
  private sortedActiveUnits(): readonly UnitOfMeasure[] {
    return this.sortUnits(this.units());
  }

  /**
   * Sorts units by name.
   *
   * @param units Units to sort.
   * @returns Sorted copy.
   */
  private sortUnits(units: readonly UnitOfMeasure[]): readonly UnitOfMeasure[] {
    return [...units].sort((first, second) => first.name.localeCompare(second.name));
  }

  /**
   * Closes the dialog without saving.
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Saves the sale.
   */
  onSave(): void {
    if (this.saleForm.invalid) {
      this.saleForm.markAllAsTouched();
      return;
    }

    const unitOid = this.saleForm.get('unitOfMeasureOid')?.value;
    const unit = typeof unitOid === 'string' ? this.unitsById().get(unitOid) : undefined;

    this.isLoading.set(true);

    const request: CreateSaleRequest = {
      productOid: this.data.product.id,
      quantity: this.saleForm.get('quantity')?.value,
      unitOfMeasureOid: unitOid,
      isPack: unit?.isPack === true,
      totalSalePrice: this.saleForm.get('totalSalePrice')?.value,
      notes: this.saleForm.get('notes')?.value,
      companyOid: this.data.companyOid ?? undefined
    };

    this.salesService.createSale(request).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.notifications.success(SALES_CONSTANTS.MESSAGES.SALE_CREATED_SUCCESSFULLY);
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.notifications.error(extractApiErrorMessage(error, SALES_CONSTANTS.MESSAGES.ERROR_CREATING_SALE));
      }
    });
  }

  /**
   * Formats a number as currency.
   *
   * @param value Number to format.
   * @returns Formatted currency string.
   */
  formatCurrency(value: number): string {
    return formatCurrencyUtil(value);
  }

  /**
   * Returns the profit color class.
   *
   * @returns CSS class name.
   */
  getProfitColorClass(): string {
    return this.profit() > 0 ? 'profit-positive' : 'profit-negative';
  }
}
