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
import { ACQUISITIONS_CONSTANTS } from '@shared/constants/acquisitions.constants';
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
    MatProgressSpinnerModule
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
  /** True while the container is submitting the acquisition. */
  readonly isSaving = input<boolean>(false);

  /** Emitted when the user requests to save a valid form. */
  readonly save = output<AcquisitionFormModel>();
  /** Emitted when the user cancels the form. */
  readonly cancel = output<void>();

  readonly acquisitionForm: FormGroup;
  readonly filteredProducts = signal<Product[]>([]);
  readonly filteredOptions = signal<Product[]>([]);
  readonly selectedProduct = signal<Product | null>(null);
  readonly productSearchValue = signal<string | Product | null>(null);

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
      });
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

    if (this.affectsInventory()) {
      const hasProduct = this.selectedProduct() !== null || this.isNewProduct();
      const quantityValid = this.isNewProduct()
        ? (this.acquisitionForm.get('newProductStock')?.value > 0)
        : (this.acquisitionForm.get('quantity')?.valid ?? false);
      const unitPublicCostValid = this.acquisitionForm.get('unitPublicCost')?.valid ?? false;
      return hasProduct &&
             acquisitionTypeValid &&
             quantityValid &&
             realCostValid &&
             unitPublicCostValid &&
             (!this.isNewProduct() || this.productFieldsValid());
    }

    const productSearchValue = this.productSearchValue();
    const hasProductName = productSearchValue != null &&
      (typeof productSearchValue === 'string' ? productSearchValue.trim() !== '' : true);
    return hasProductName && acquisitionTypeValid && realCostValid;
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
    const newProductDescriptionControl = this.acquisitionForm.get('newProductDescription');
    const newProductStockControl = this.acquisitionForm.get('newProductStock');
    const newProductUrlPhotoControl = this.acquisitionForm.get('newProductUrlPhoto');

    const selectedId = this.acquisitionForm.get('acquisitionTypeOid')?.value;
    const selectedType = this.acquisitionTypes().find(type => type.id === selectedId);
    const affectsInv = selectedType?.affectsInventory ?? false;

    if (affectsInv) {
      // Add required validators back
      unitPublicCostControl?.setValidators([Validators.required, Validators.min(0)]);
      quantityControl?.setValidators([Validators.required, Validators.min(1)]);
      newProductDescriptionControl?.setValidators([Validators.required]);
    } else {
      // Remove required validators and clear values
      unitPublicCostControl?.clearValidators();
      unitPublicCostControl?.setValue(ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);
      unitPublicCostControl?.updateValueAndValidity();

      quantityControl?.clearValidators();
      quantityControl?.setValue(ACQUISITIONS_CONSTANTS.NUMBERS.ONE);
      quantityControl?.updateValueAndValidity();

      newProductDescriptionControl?.clearValidators();
      newProductDescriptionControl?.setValue(ACQUISITIONS_CONSTANTS.STRINGS.EMPTY);
      newProductDescriptionControl?.updateValueAndValidity();

      newProductStockControl?.setValue(ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);
      newProductStockControl?.updateValueAndValidity();

      newProductUrlPhotoControl?.setValue(ACQUISITIONS_CONSTANTS.STRINGS.EMPTY);
      newProductUrlPhotoControl?.updateValueAndValidity();
    }

    // Always update validity
    unitPublicCostControl?.updateValueAndValidity();
    quantityControl?.updateValueAndValidity();
    newProductDescriptionControl?.updateValueAndValidity();
  }

  /**
   * Filters products by name based on search term.
   *
   * @param event Input event containing the search term.
   */
  filterByProductName(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const searchTerm = inputElement.value;
    const term = searchTerm.toLowerCase();
    const allProducts = this.filteredProducts();

    if (!term) {
      this.filteredOptions.set(allProducts.slice(0, ACQUISITIONS_CONSTANTS.AUTOCOMPLETE.MAX_RESULTS));
    } else {
      const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
      this.filteredOptions.set(filtered);
    }
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
      unitPublicCost: product.unitPublicCost
    });
  }

  /**
   * Selects the option to create a new product.
   */
  selectNewProductOption(): void {
    this.selectedProduct.set(null);
    this.acquisitionForm.patchValue({
      realCost: 0,
      unitPublicCost: 0
    });
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
    return {
      acquisitionTypeOid: value('acquisitionTypeOid'),
      productSearchRaw: value('productSearch'),
      isNewProduct: this.isNewProduct(),
      affectsInventory: this.affectsInventory(),
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
      newProductDescription: ACQUISITIONS_CONSTANTS.STRINGS.EMPTY,
      newProductStock: ACQUISITIONS_CONSTANTS.NUMBERS.ZERO,
      newProductUrlPhoto: ACQUISITIONS_CONSTANTS.STRINGS.EMPTY
    });
    this.selectedProduct.set(null);
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
