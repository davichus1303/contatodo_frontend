import { Component, inject, signal, computed, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AcquisitionsService } from './acquisitions.service';
import { ProductsService } from '../products/products.service';
import { AcquisitionTypeService } from './acquisition-type.service';
import { Acquisition } from '../../shared/models/acquisition.model';
import { Product } from '../../shared/models/product.model';
import { AcquisitionType } from '../../shared/models/acquisition-type.model';
import { CreateAcquisitionRequest } from '../../shared/dto/acquisition-request.dto';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { GENERAL_CONSTANTS } from '../../shared/constants/general.constants';
import { ACQUISITIONS_CONSTANTS } from '../../shared/constants/acquisitions.constants';
import { I18nService } from '../../shared/utils/i18n.util';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-new-acquisition',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './new-acquisition.component.html',
  styleUrls: ['./new-acquisition.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewAcquisitionComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly acquisitionsService = inject(AcquisitionsService);
  private readonly productsService = inject(ProductsService);
  private readonly acquisitionTypeService = inject(AcquisitionTypeService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly i18nService = inject(I18nService);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('productSearchInput') productSearchInput!: ElementRef<HTMLInputElement>;

  readonly acquisitionForm: FormGroup;
  readonly filteredProducts = signal<Product[]>([]);
  readonly filteredOptions = signal<Product[]>([]);
  readonly selectedProduct = signal<Product | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly acquisitionTypes = signal<AcquisitionType[]>([]);
  readonly productSearchValue = signal<string | Product | null>(null);

  // Signals for reactive computation (initialized in ngOnInit)
  readonly realCost = signal(ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);
  readonly quantity = signal(ACQUISITIONS_CONSTANTS.NUMBERS.ONE);
  readonly newProductStock = signal(ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);

  readonly isFormValid = computed(() => {
    const acquisitionTypeValid = this.acquisitionForm.get('acquisitionTypeOid')?.valid;
    const realCostValue = this.realCost();
    const realCostValid = realCostValue !== null && realCostValue !== undefined && realCostValue >= 0;
    const productSearchValue = this.productSearchValue();
    
    if (this.affectsInventory()) {
      const hasProduct = this.selectedProduct() !== null || this.isNewProduct();
      const quantityValid = this.isNewProduct() 
        ? (this.acquisitionForm.get('newProductStock')?.value > 0)
        : this.acquisitionForm.get('quantity')?.valid;
      return hasProduct &&
             acquisitionTypeValid &&
             quantityValid &&
             realCostValid &&
             this.acquisitionForm.get('unitPublicCost')?.valid &&
             (!this.isNewProduct() || this.productFieldsValid());
    } else {
      // When affectsInventory is false, basic fields are required including product name
      const hasProductName = productSearchValue != null && 
        (typeof productSearchValue === 'string' ? productSearchValue.trim() !== '' : true);
      return hasProductName &&
             acquisitionTypeValid &&
             realCostValid;
    }
  });

  /**
   * Traditional method to check if the product is new (not in database).
   * Searches for the product name in the loaded products from the database.
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
   * Traditional function to check if the form is valid.
   * Called actively by the button to ensure reactivity.
   */
  isFormValidFn(): boolean {
    const acquisitionTypeValid = this.acquisitionForm.get('acquisitionTypeOid')?.valid ?? false;
    const realCostValue = this.realCost();
    const realCostValid = realCostValue !== null
      && realCostValue !== undefined
      && realCostValue > 0;
    const productSearchValue = this.productSearchValue();
    
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
    } else {
      const hasProductName = productSearchValue != null && 
        (typeof productSearchValue === 'string' ? productSearchValue.trim() !== '' : true);
      return hasProductName &&
             acquisitionTypeValid &&
             realCostValid;
    }
  }

  readonly unitRealCost = computed(() => {
    const cost = this.realCost();
    const qty = this.isNewProduct() 
      ? this.newProductStock()
      : this.quantity();
    return qty > 0 ? cost / qty : 0;
  });

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

    this.loadAcquisitionTypes();
    this.loadProducts();

    // Subscribe to form control changes to update signals
    this.acquisitionForm.get('realCost')?.valueChanges.subscribe(value => {
      this.realCost.set(value || ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);
    });
    this.acquisitionForm.get('quantity')?.valueChanges.subscribe(value => {
      this.quantity.set(value || ACQUISITIONS_CONSTANTS.NUMBERS.ONE);
    });
    this.acquisitionForm.get('newProductStock')?.valueChanges.subscribe(value => {
      this.newProductStock.set(value || ACQUISITIONS_CONSTANTS.NUMBERS.ZERO);
    });
    this.acquisitionForm.get('productSearch')?.valueChanges.subscribe(value => {
      this.productSearchValue.set(value);
    });
    
  }


  /*
    * Checks if the acquisition form is valid.
  */
  public isAqcisitionFormValid(): boolean | undefined {
    const acquisitionTypeValid = this.acquisitionForm.get('acquisitionTypeOid')?.valid;
    const realCostValid = this.acquisitionForm.get('realCost')?.valid;
    
    if (this.affectsInventory()) {
      // When affectsInventory is true, all inventory-related fields are required
      const quantityValid = this.acquisitionForm.get('quantity')?.valid;
      return acquisitionTypeValid &&
             quantityValid &&
             realCostValid &&
             this.acquisitionForm.get('unitPublicCost')?.valid &&
             this.productFieldsValid();
    } else {
      // When affectsInventory is false, only basic fields are required
      return acquisitionTypeValid && realCostValid;
    }
  }

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
   * Loads acquisition types from the API.
   */
  private loadAcquisitionTypes(): void {
    this.acquisitionTypeService.getAcquisitionTypes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: ApiResponse<AcquisitionType[]>) => {
        this.acquisitionTypes.set(response.data ?? []);
      },
      error: () => {
        this.snackBar.open(
          ACQUISITIONS_CONSTANTS.MESSAGES.ERROR_LOADING_ACQUISITIONS,
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
      }
    });
  }

  ngOnInit(): void {
    // Product search filtering is now handled via input event in HTML
  }

  ngAfterViewInit(): void {
    // No auto-focus on any form element
  }

  /**
   * Loads all products for the autocomplete search.
   */
  loadProducts(): void {
    this.productsService.getAllProducts().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: ApiResponse<Product[]>) => {
        const products = (response.data ?? []).filter(p => p.stock >= 0);
        this.filteredProducts.set(products);
        this.filteredOptions.set(products.slice(0, ACQUISITIONS_CONSTANTS.AUTOCOMPLETE.MAX_RESULTS));
      },
      error: () => {
        this.snackBar.open(
          ACQUISITIONS_CONSTANTS.MESSAGES.ERROR_LOADING_PRODUCTS,
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
      }
    });
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
   * Handles changes in the product search field.
   *
   * @param value Current search value.
   */
  onProductSearchChange(value: string | Product): void {
    if (!value) {
      this.selectedProduct.set(null);
      this.filteredOptions.set(this.filteredProducts().slice(0, ACQUISITIONS_CONSTANTS.AUTOCOMPLETE.MAX_RESULTS));
      return;
    }

    if (typeof value === 'string') {
      if (value.trim() === GENERAL_CONSTANTS.EMPTY) {
        this.selectedProduct.set(null);
        this.filteredOptions.set(this.filteredProducts().slice(0, ACQUISITIONS_CONSTANTS.AUTOCOMPLETE.MAX_RESULTS));
        return;
      }

      const term = value.toLowerCase();
      const filtered = this.filteredProducts().filter(p => p.name.toLowerCase().includes(term));
      this.filteredOptions.set(filtered);

      const matchedProduct = this.filteredProducts().find(p => p.name.toLowerCase() === term);

      if (matchedProduct) {
        this.selectProduct(matchedProduct);
      }
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
   * Validates the new product fields.
   *
   * @returns True if all required fields are valid.
   */
  productFieldsValid(): boolean {
    const description = this.acquisitionForm.get('newProductDescription')?.value || EMPTY;
    const stock = this.acquisitionForm.get('newProductStock')?.value;
    const realCost = this.acquisitionForm.get('realCost')?.value;
    const unitPublicCost = this.acquisitionForm.get('unitPublicCost')?.value;

    return !!description && stock >= 0 && realCost >= 0 && unitPublicCost >= 0;
  }

  /**
   * Navigates back to the acquisitions list.
   */
  goBack(): void {
    this.router.navigate(['/acquisitions']);
  }

  /**
   * Opens confirmation dialog before saving.
   */
  onSave(): void {
    if (!this.isFormValid()) {
      return;
    }

    const dialogData: ConfirmationDialogData = {
      titleKey: 'ACQUISITIONS.CONFIRMATION.TITLE',
      messageKey: 'ACQUISITIONS.CONFIRMATION.MESSAGE',
      cancelKey: 'ACQUISITIONS.FORM.CANCEL',
      confirmKey: 'ACQUISITIONS.FORM.SAVE'
    };
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: ACQUISITIONS_CONSTANTS.DIALOG.WIDTH,
      data: dialogData
    });

    dialogRef.afterClosed().pipe(
      takeUntil(this.destroy$)
    ).subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.submitAcquisition();
      }
    });
  }

  /**
   * Submits the acquisition to the backend.
   */
  submitAcquisition(): void {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    const request: CreateAcquisitionRequest = {
      acquisitionTypeOid: this.acquisitionForm.get('acquisitionTypeOid')?.value,
      realCost: this.acquisitionForm.get('realCost')?.value
    };

    // Handle product-related fields
    if (this.affectsInventory()) {
      // When affectsInventory is true, use product selection
      const productSearchValue = this.acquisitionForm.get('productSearch')?.value;
      const productName = typeof productSearchValue === 'string' 
        ? productSearchValue 
        : productSearchValue?.name || ACQUISITIONS_CONSTANTS.STRINGS.EMPTY;

      request.productName = this.isNewProduct() 
        ? productName 
        : productName;
      request.quantity = this.isNewProduct() 
        ? (this.acquisitionForm.get('newProductStock')?.value || 1)
        : this.acquisitionForm.get('quantity')?.value;

      const unitPublicCost = this.acquisitionForm.get('unitPublicCost')?.value;
      if (unitPublicCost) {
        request.unitPublicCost = unitPublicCost;
      }
      
      if (this.isNewProduct()) {
        const description = this.acquisitionForm.get('newProductDescription')?.value;
        if (description) {
          request.description = description;
        }
      }
    } else {
      // When affectsInventory is false, use product search value as product name
      const productSearchValue = this.acquisitionForm.get('productSearch')?.value;
      if (productSearchValue && typeof productSearchValue === 'string') {
        request.productName = productSearchValue.trim();
      }
      request.quantity = this.acquisitionForm.get('quantity')?.value;
    }

    // Only include optional fields if they have values
    const supplierName = this.acquisitionForm.get('supplierName')?.value;
    if (supplierName) {
      request.supplierName = supplierName;
    }

    const invoiceNumber = this.acquisitionForm.get('invoiceNumber')?.value;
    if (invoiceNumber) {
      request.invoiceNumber = invoiceNumber;
    }

    const observations = this.acquisitionForm.get('observations')?.value;
    if (observations) {
      request.observations = observations;
    }

    // Only include inventory-related fields when affectsInventory is true
    if (this.affectsInventory()) {
      const unitPublicCost = this.acquisitionForm.get('unitPublicCost')?.value;
      if (unitPublicCost) {
        request.unitPublicCost = unitPublicCost;
      }
      
      if (this.isNewProduct()) {
        const description = this.acquisitionForm.get('newProductDescription')?.value;
        if (description) {
          request.description = description;
        }
      }
    }

    this.acquisitionsService.createAcquisition(request).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.dialog.closeAll();
        this.snackBar.open(
          ACQUISITIONS_CONSTANTS.MESSAGES.ACQUISITION_REGISTERED_SUCCESSFULLY,
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
        this.resetForm();
        this.loadProducts();
      },
      error: (error: { error?: { message?: string } }) => {
        this.isSaving.set(false);
        this.snackBar.open(
          error.error?.message || ACQUISITIONS_CONSTANTS.MESSAGES.ERROR_REGISTERING_ACQUISITION,
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
      }
    });
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

  /**
   * Cleanup on component destroy.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
