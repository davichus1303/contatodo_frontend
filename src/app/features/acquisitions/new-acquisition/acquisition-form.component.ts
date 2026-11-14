import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Product } from '@core/domain/models/product.model';
import { AcquisitionType } from '@core/domain/models/acquisition-type.model';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';
import { ACQUISITIONS_CONSTANTS } from '@shared/constants/acquisitions.constants';
import { UnitOfMeasureSelectComponent } from '@shared/components/unit-of-measure-select/unit-of-measure-select.component';
import { I18nService } from '@core/i18n/i18n.service';
import { AcquisitionFormModel } from './acquisition-form.model';

/**
 * Presentational acquisition form.
 *
 * Owns the reactive form state and derived validity signals only. Data and
 * saving state arrive through inputs; saving/canceling decisions are emitted
 * upward so orchestration stays in {@link NewAcquisitionComponent}.
 */
@Component({
  selector: 'app-acquisition-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    UnitOfMeasureSelectComponent
  ],
  templateUrl: './acquisition-form.component.html',
  styleUrls: ['./acquisition-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcquisitionFormComponent {
  private readonly fb = inject(FormBuilder);
  readonly i18nService = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Available acquisition types loaded by the container. */
  readonly acquisitionTypes = input<AcquisitionType[]>([]);
  /** Known products used to detect brand-new products in the search field. */
  readonly products = input<Product[]>([]);
  /** Active units of measure of the company, used by the unit selectors. */
  readonly units = input<UnitOfMeasure[]>([]);
  /** True while the container is submitting the acquisition. */
  readonly isSaving = input<boolean>(false);

  /** Emitted when the user requests to save a valid form. */
  readonly save = output<AcquisitionFormModel>();
  /** Emitted when the user cancels the form. */
  readonly cancel = output<void>();

  readonly acquisitionForm: FormGroup;
  readonly selectedProduct = signal<Product | null>(null);
  readonly productSearchValue = signal<string | Product | null>(null);
  readonly selectedNewProductUnitOids = signal<readonly string[]>([]);
  readonly selectedAcquisitionUnitOid = signal<string | null>(null);

  // Mirrored control values driving computed costs/validity.
  readonly realCost = signal(ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);
  readonly quantity = signal(ACQUISITIONS_CONSTANTS.NUMBERS.ONE);
  readonly newProductStock = signal(ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);

  readonly selectedAcquisitionTypeId = signal<string | null>(null);

  readonly selectedAcquisitionType = computed(() => {
    const id = this.selectedAcquisitionTypeId();
    return this.acquisitionTypes().find(t => t.id === id) ?? null;
  });

  readonly affectsInventory = computed(() => {
    const type = this.selectedAcquisitionType();
    return type?.affectsInventory ?? false;
  });

  /** Active units indexed by identifier. */
  private readonly unitsById = computed(
    () => new Map(this.units().map(unit => [unit.id, unit] as const))
  );

  /**
   * Units offered as the acquisition unit.
   *
   * <p>An existing product only offers the units declared in its attributes;
   * a brand-new product offers the units selected as its attributes; a
   * non-inventory acquisition offers every active unit because it has no
   * product catalog entry to constrain the choice.</p>
   */
  readonly availableAcquisitionUnits = computed<readonly UnitOfMeasure[]>(() => {
    if (!this.affectsInventory()) {
      return this.sortedActiveUnits();
    }

    const product = this.selectedProduct();
    if (product && !this.isNewProduct()) {
      const declared = product.unitOfMeasures ?? [];
      if (declared.length === 0) {
        return this.sortedActiveUnits();
      }

      return declared
        .map(oid => this.unitsById().get(oid))
        .filter((unit): unit is UnitOfMeasure => unit !== undefined);
    }

    return this.selectedNewProductUnitOids()
      .map(oid => this.unitsById().get(oid))
      .filter((unit): unit is UnitOfMeasure => unit !== undefined);
  });

  /** Unit currently selected to register the acquisition. */
  readonly selectedAcquisitionUnit = computed(() => {
    const oid = this.selectedAcquisitionUnitOid();
    return oid ? this.unitsById().get(oid) ?? null : null;
  });

  /** True when the acquisition is registered in a pack unit. */
  readonly selectedAcquisitionUnitIsPack = computed(
    () => this.selectedAcquisitionUnit()?.isPack === true
  );

  /**
   * Whether the selected new-product attributes include a pack unit.
   *
   * <p>Pack size is only offered for brand-new products, so an existing
   * product always resolves to false even if its acquisition unit is a pack.</p>
   */
  readonly hasPackUnitSelected = computed(() => {
    if (!this.affectsInventory() || !this.isNewProduct()) {
      return false;
    }

    return this.selectedNewProductUnitOids().some(
      oid => this.unitsById().get(oid)?.isPack === true
    );
  });

  /**
   * Existing products available for the autocomplete, flowed from the loaded
   * reference data. Previously the local list was populated imperatively by
   * the container; it now derives straight from the {@link products} input.
   */
  readonly filteredProducts = computed(() => this.products());

  /**
   * Autocomplete options for the product field: the full existing list when
   * nothing is being typed, otherwise the products matching the search term.
   */
  readonly filteredOptions = computed(() => {
    const source = this.filteredProducts();
    const value = this.productSearchValue();

    if (typeof value !== 'string' || value.trim().length === 0) {
      return source.slice(0, ACQUISITIONS_CONSTANTS.AUTOCOMPLETE.MAX_RESULTS);
    }

    const term = value.trim().toLowerCase();
    return source.filter(p => p.name.toLowerCase().includes(term));
  });

  constructor() {
    this.acquisitionForm = this.fb.group({
      productSearch: [null],
      acquisitionTypeOid: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      realCost: [0, [Validators.required, Validators.min(0)]],
      unitPublicCost: [0, [Validators.min(0)]],
      supplierName: [''],
      invoiceNumber: [''],
      observations: [''],
      // Product attribute fields (brand-new products only)
      unitOfMeasures: [[]],
      // Acquisition unit shared by every flow
      unitOfMeasure: [null, Validators.required],
      packSize: [null],
      // New product fields
      newProductDescription: [''],
      newProductStock: [0],
      newProductUrlPhoto: ['']
    });

    this.acquisitionForm.get('realCost')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.realCost.set(value || ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);
      });
    this.acquisitionForm.get('quantity')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.quantity.set(value || ACQUISITIONS_CONSTANTS.NUMBERS.ONE);
      });
    this.acquisitionForm.get('newProductStock')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.newProductStock.set(value || ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);
      });
    this.acquisitionForm.get('productSearch')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.productSearchValue.set(value);
        this.clearStaleSelectedProduct(value);
        this.syncModeState();
      });
    this.acquisitionForm.get('unitOfMeasures')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.selectedNewProductUnitOids.set(Array.isArray(value) ? value : []);
        this.syncAcquisitionUnitSelection();
        this.syncPackSizeState();
      });
    this.acquisitionForm.get('unitOfMeasure')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.selectedAcquisitionUnitOid.set(
          typeof value === 'string' && value.length > 0 ? value : null
        );
      });
  }

  /**
   * Active units sorted by name for a stable presentation.
   *
   * @returns Sorted copy of the active units.
   */
  private sortedActiveUnits(): readonly UnitOfMeasure[] {
    return [...this.units()].sort((first, second) => first.name.localeCompare(second.name));
  }

  /**
   * Drops a previously selected product once the operator edits its name.
   *
   * <p>Without this the stale product would keep constraining the acquisition
   * unit options while the form already treats the typed text as a brand-new
   * product.</p>
   *
   * @param value Current product search value.
   */
  private clearStaleSelectedProduct(value: unknown): void {
    const product = this.selectedProduct();
    if (!product || typeof value !== 'string') {
      return;
    }

    if (value.trim().toLowerCase() !== product.name.trim().toLowerCase()) {
      this.selectedProduct.set(null);
    }
  }

  /**
   * Synchronizes the validators and derived state with the current mode.
   *
   * <p>Product units and pack size only apply to brand-new products that
   * affect inventory; the acquisition unit is always required.</p>
   */
  private syncModeState(): void {
    const unitOfMeasuresControl = this.acquisitionForm.get('unitOfMeasures');
    if (this.affectsInventory() && this.isNewProduct()) {
      unitOfMeasuresControl?.setValidators([Validators.required]);
    } else {
      unitOfMeasuresControl?.clearValidators();
    }
    unitOfMeasuresControl?.updateValueAndValidity({ emitEvent: false });

    const selected = unitOfMeasuresControl?.value;
    this.selectedNewProductUnitOids.set(Array.isArray(selected) ? selected : []);
    this.syncAcquisitionUnitSelection();
    this.syncPackSizeState();
  }

  /**
   * Keeps the acquisition unit within the units offered by the current mode.
   *
   * <p>When the operator has exactly one option it is selected automatically;
   * otherwise a unit that is no longer offered is cleared so the payload never
   * carries an invalid identifier.</p>
   */
  private syncAcquisitionUnitSelection(): void {
    const available = this.availableAcquisitionUnits();
    const control = this.acquisitionForm.get('unitOfMeasure');
    const current = control?.value;

    if (typeof current === 'string' && available.some(unit => unit.id === current)) {
      return;
    }

    if (available.length === 1) {
      control?.setValue(available[0].id);
      return;
    }

    if (current !== null && current !== undefined && current !== '') {
      control?.setValue(null);
    }
  }

  /**
   * Applies the pack-size rules of brand-new products.
   *
   * <p>The field is required and must be a positive integer while a selected
   * attribute is a pack; otherwise it is cleared because the backend must use
   * the product's stored pack size.</p>
   */
  private syncPackSizeState(): void {
    const control = this.acquisitionForm.get('packSize');

    if (this.hasPackUnitSelected()) {
      control?.setValidators([Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]);
    } else {
      control?.clearValidators();
      control?.setValue(null, { emitEvent: false });
    }
    control?.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Checks whether the product being typed does not exist in the database.
   *
   * @returns true if product doesn't exist in database, false if it exists
   */
  isNewProduct(): boolean {
    const productSearchValue = this.productSearchValue();
    if (!productSearchValue || typeof productSearchValue !== 'string') {
      return false;
    }

    const searchTerm = productSearchValue.trim().toLowerCase();
    if (!searchTerm) {
      return false;
    }

    // Search for exact match in database products
    const existsInDatabase = this.filteredProducts().some(p =>
      p.name.toLowerCase() === searchTerm
    );

    return !existsInDatabase;
  }

  /**
   * Canonical save gate shared by the submit button and the save emission,
   * so the UI and the guard can never disagree.
   *
   * @returns true when the form satisfies every rule of the current mode.
   */
  canSaveAcquisition(): boolean {
    const acquisitionTypeValid = this.acquisitionForm.get('acquisitionTypeOid')?.valid ?? false;
    const realCostValue = this.realCost();
    const realCostValid = realCostValue !== null
      && realCostValue !== undefined
      && realCostValue > 0;
    const unitOfMeasureValid = this.hasValidAcquisitionUnit();

    if (this.affectsInventory()) {
      const isNewProduct = this.isNewProduct();
      const hasProduct = this.selectedProduct() !== null || isNewProduct;
      const quantityValid = isNewProduct
        ? (this.acquisitionForm.get('newProductStock')?.value > 0)
        : (this.acquisitionForm.get('quantity')?.valid ?? false);
      const unitPublicCostValid = this.acquisitionForm.get('unitPublicCost')?.valid ?? false;
      const newProductUnitsValid = !isNewProduct || this.hasValidNewProductUnits();
      const packSizeValid = !isNewProduct || !this.hasPackUnitSelected() || this.isPackSizeValid();

      return hasProduct &&
             acquisitionTypeValid &&
             quantityValid &&
             realCostValid &&
             unitPublicCostValid &&
             unitOfMeasureValid &&
             newProductUnitsValid &&
             packSizeValid &&
             (!isNewProduct || this.productFieldsValid());
    }

    const productSearchValue = this.productSearchValue();
    const hasProductName = productSearchValue != null &&
      (typeof productSearchValue === 'string' ? productSearchValue.trim() !== '' : true);
    return hasProductName && acquisitionTypeValid && realCostValid && unitOfMeasureValid;
  }

  /**
   * Whether the selected acquisition unit belongs to the units offered by the
   * current product or, for non-inventory acquisitions, to the active catalog.
   *
   * @returns True when the acquisition unit is valid.
   */
  private hasValidAcquisitionUnit(): boolean {
    const current = this.acquisitionForm.get('unitOfMeasure')?.value;
    return typeof current === 'string' &&
      current.length > 0 &&
      this.availableAcquisitionUnits().some(unit => unit.id === current);
  }

  /**
   * Whether a brand-new product declares at least one known active unit.
   *
   * @returns True when the attribute units are valid.
   */
  private hasValidNewProductUnits(): boolean {
    const selected = this.selectedNewProductUnitOids();
    return selected.length > 0 && selected.every(oid => this.unitsById().has(oid));
  }

  /**
   * Whether the pack size is a positive integer.
   *
   * @returns True when the pack size is valid.
   */
  private isPackSizeValid(): boolean {
    const value = Number(this.acquisitionForm.get('packSize')?.value);
    return Number.isInteger(value) && value > 0;
  }

  readonly unitRealCost = computed(() => {
    const cost = this.realCost();
    const qty = this.isNewProduct()
      ? this.newProductStock()
      : this.quantity();
    return qty > 0 ? cost / qty : 0;
  });

  /**
   * Handles changes in the acquisition type selection.
   * Updates form validation and clears hidden field values when switching between types.
   */
  onAcquisitionTypeChange(): void {
    const selectedId = this.acquisitionForm.get('acquisitionTypeOid')?.value;
    this.selectedAcquisitionTypeId.set(selectedId);
    this.updateValidationBasedOnAcquisitionType();
  }

  /**
   * Updates form validation based on the selected acquisition type.
   * When affectsInventory is false, removes required validators from hidden fields.
   * When affectsInventory is true, adds required validators back.
   * Also clears values when switching from affectsInventory=true to false.
   */
  private updateValidationBasedOnAcquisitionType(): void {
    const unitPublicCostControl = this.acquisitionForm.get('unitPublicCost');
    const quantityControl = this.acquisitionForm.get('quantity');
    const realCostControl = this.acquisitionForm.get('realCost');
    const newProductDescriptionControl = this.acquisitionForm.get('newProductDescription');
    const newProductStockControl = this.acquisitionForm.get('newProductStock');
    const newProductUrlPhotoControl = this.acquisitionForm.get('newProductUrlPhoto');
    const productSearchControl = this.acquisitionForm.get('productSearch');
    const unitOfMeasuresControl = this.acquisitionForm.get('unitOfMeasures');
    const unitOfMeasureControl = this.acquisitionForm.get('unitOfMeasure');
    const packSizeControl = this.acquisitionForm.get('packSize');

    const selectedId = this.acquisitionForm.get('acquisitionTypeOid')?.value;
    const selectedType = this.acquisitionTypes().find(type => type.id === selectedId);
    const affectsInv = selectedType?.affectsInventory ?? false;

    // Any acquisition type change resets the type-specific values so no cost
    // or product state from the previous type leaks into the new one
    // (legacy only cleared them when leaving inventory types).
    realCostControl?.setValue(ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);
    unitPublicCostControl?.setValue(ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);
    quantityControl?.setValue(ACQUISITIONS_CONSTANTS.NUMBERS.ONE);
    productSearchControl?.setValue(ACQUISITIONS_CONSTANTS.STRINGS.EMPTY);
    newProductDescriptionControl?.setValue(ACQUISITIONS_CONSTANTS.STRINGS.EMPTY);
    newProductStockControl?.setValue(ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);
    newProductUrlPhotoControl?.setValue(ACQUISITIONS_CONSTANTS.STRINGS.EMPTY);
    unitOfMeasuresControl?.setValue([]);
    unitOfMeasureControl?.setValue(null);
    packSizeControl?.setValue(null, { emitEvent: false });
    this.selectedProduct.set(null);

    if (affectsInv) {
      // Add required validators back
      unitPublicCostControl?.setValidators([Validators.required, Validators.min(0)]);
      quantityControl?.setValidators([Validators.required, Validators.min(1)]);
      newProductDescriptionControl?.setValidators([Validators.required]);
    } else {
      // Remove required validators
      unitPublicCostControl?.clearValidators();
      quantityControl?.clearValidators();
      newProductDescriptionControl?.clearValidators();
    }

    // Always update validity
    realCostControl?.updateValueAndValidity();
    unitPublicCostControl?.updateValueAndValidity();
    quantityControl?.updateValueAndValidity();
    productSearchControl?.updateValueAndValidity();
    newProductDescriptionControl?.updateValueAndValidity();
    newProductStockControl?.updateValueAndValidity();
    newProductUrlPhotoControl?.updateValueAndValidity();
    unitOfMeasuresControl?.updateValueAndValidity({ emitEvent: false });
    unitOfMeasureControl?.updateValueAndValidity();
    packSizeControl?.updateValueAndValidity({ emitEvent: false });

    this.syncModeState();
  }

  /**
   * Selects an existing product and populates the form.
   *
   * @param product Product to select.
   */
  selectProduct(product: Product): void {
    this.selectedProduct.set(product);
    this.acquisitionForm.patchValue({
      productSearch: product,
      realCost: product.realCost,
      unitPublicCost: product.unitPublicCost,
      unitOfMeasures: [],
      packSize: null
    });
    this.syncModeState();
  }

  /**
   * Selects the option to create a new product.
   */
  selectNewProductOption(): void {
    this.selectedProduct.set(null);
    this.acquisitionForm.patchValue({
      realCost: 0,
      unitPublicCost: 0,
      unitOfMeasures: [],
      unitOfMeasure: null,
      packSize: null
    });
    this.syncModeState();
  }

  /**
   * Validates the numeric new-product fields.
   *
   * Legacy note: the original implementation compared the description against
   * an always-truthy rxjs constant (`EMPTY` imported from 'rxjs'), so an empty
   * description never actually blocked saving. We intentionally keep that
   * observable behavior until the backend contract is revisited.
   *
   * @returns True if all numeric fields are within valid ranges.
   */
  productFieldsValid(): boolean {
    const stock = this.acquisitionForm.get('newProductStock')?.value;
    const realCost = this.acquisitionForm.get('realCost')?.value;
    const unitPublicCost = this.acquisitionForm.get('unitPublicCost')?.value;

    return stock >= 0 && realCost >= 0 && unitPublicCost >= 0;
  }

  /**
   * Emits the save request with the current raw form state.
   * The canonical gate keeps the button and the emission aligned.
   */
  onSave(): void {
    if (!this.canSaveAcquisition()) {
      return;
    }
    this.save.emit(this.buildFormModel());
  }

  /** Emits the cancel request. */
  onCancel(): void {
    this.cancel.emit();
  }

  /**
   * Builds the raw view model handed to the container's mapper.
   */
  private buildFormModel(): AcquisitionFormModel {
    const value = (name: string) => this.acquisitionForm.get(name)?.value;
    const isNewProduct = this.isNewProduct();
    const packSize = value('packSize');
    return {
      acquisitionTypeOid: value('acquisitionTypeOid'),
      productSearchRaw: value('productSearch'),
      isNewProduct,
      affectsInventory: this.affectsInventory(),
      unitOfMeasures: isNewProduct && this.affectsInventory()
        ? [...this.selectedNewProductUnitOids()]
        : [],
      unitOfMeasure: value('unitOfMeasure') ?? null,
      packSize: isNewProduct && this.hasPackUnitSelected() && packSize != null
        ? Number(packSize)
        : null,
      quantity: value('quantity'),
      realCost: value('realCost'),
      unitPublicCost: value('unitPublicCost'),
      supplierName: value('supplierName'),
      invoiceNumber: value('invoiceNumber'),
      observations: value('observations'),
      newProductDescription: value('newProductDescription'),
      newProductStock: value('newProductStock')
    };
  }

  /**
   * Resets the form to its initial state.
   */
  resetForm(): void {
    this.acquisitionForm.reset({
      productSearch: null,
      acquisitionTypeOid: ACQUISITIONS_CONSTANTS.STRINGS.EMPTY,
      quantity: ACQUISITIONS_CONSTANTS.NUMBERS.ONE,
      realCost: ACQUISITIONS_CONSTANTS.NUMBERS.ZERO,
      unitPublicCost: ACQUISITIONS_CONSTANTS.NUMBERS.ZERO,
      supplierName: ACQUISITIONS_CONSTANTS.STRINGS.EMPTY,
      invoiceNumber: ACQUISITIONS_CONSTANTS.STRINGS.EMPTY,
      observations: ACQUISITIONS_CONSTANTS.STRINGS.EMPTY,
      unitOfMeasures: [],
      unitOfMeasure: null,
      packSize: null,
      newProductDescription: ACQUISITIONS_CONSTANTS.STRINGS.EMPTY,
      newProductStock: ACQUISITIONS_CONSTANTS.NUMBERS.ZERO,
      newProductUrlPhoto: ACQUISITIONS_CONSTANTS.STRINGS.EMPTY
    });
    this.selectedProduct.set(null);
    this.selectedNewProductUnitOids.set([]);
    this.selectedAcquisitionUnitOid.set(null);
    this.syncModeState();
  }

  /**
   * Displays the product name in the autocomplete.
   *
   * @param product Product to display.
   * @returns Product name or empty string.
   */
  displayProduct(product?: Product): string {
    return product ? product.name : ACQUISITIONS_CONSTANTS.STRINGS.EMPTY;
  }
}
