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
  readonly selectedProduct = signal<Product | null>(null);
  readonly isNewProduct = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly acquisitionTypes = signal<{ id: string; name: string }[]>([]);

  // Signals for reactive computation (initialized in ngOnInit)
  readonly realCost = signal(0);
  readonly quantity = signal(1);
  readonly newProductStock = signal(0);

  readonly filteredOptions = computed(() => {
    const searchValue = this.acquisitionForm.get('productSearch')?.value;
    const searchTerm = typeof searchValue === 'string' ? searchValue.toLowerCase() : '';
    const products = this.filteredProducts();
    return searchTerm
      ? products.filter(p => p.name.toLowerCase().includes(searchTerm))
      : products.slice(0, ACQUISITIONS_CONSTANTS.AUTOCOMPLETE.MAX_RESULTS);
  });

  readonly isFormValid = computed(() => {
    const hasProduct = this.selectedProduct() !== null || this.isNewProduct();
    return hasProduct &&
           this.acquisitionForm.get('acquisitionTypeOid')?.valid &&
           (this.isNewProduct() || this.acquisitionForm.get('quantity')?.valid) &&
           this.acquisitionForm.get('realCost')?.valid &&
           this.acquisitionForm.get('unitPublicCost')?.valid &&
           (!this.isNewProduct() || this.productFieldsValid());
  });

  readonly unitRealCost = computed(() => {
    const cost = this.realCost();
    const qty = this.isNewProduct() 
      ? this.newProductStock()
      : this.quantity();
    return qty > 0 ? cost / qty : 0;
  });

  constructor() {
    this.acquisitionForm = this.fb.group({
      productSearch: [null],
      acquisitionTypeOid: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      realCost: [0, [Validators.required, Validators.min(0)]],
      unitPublicCost: [0, [Validators.required, Validators.min(0)]],
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
      this.realCost.set(value || 0);
    });
    this.acquisitionForm.get('quantity')?.valueChanges.subscribe(value => {
      this.quantity.set(value || 1);
    });
    this.acquisitionForm.get('newProductStock')?.valueChanges.subscribe(value => {
      this.newProductStock.set(value || 0);
    });
  }


  /*
    * Checks if the acquisition form is valid.
  */
  public isAqcisitionFormValid(): boolean | undefined {
    let isAqcisitionFormValid: boolean | undefined = false;
    isAqcisitionFormValid  = this.acquisitionForm.get('acquisitionTypeOid')?.valid &&
    this.acquisitionForm.get('quantity')?.valid &&
    this.acquisitionForm.get('realCost')?.valid &&
    this.acquisitionForm.get('unitPublicCost')?.valid && this.productFieldsValid();
    return isAqcisitionFormValid;
  }

  /**
   * Loads acquisition types from the API.
   */
  private loadAcquisitionTypes(): void {
    this.acquisitionTypeService.getAcquisitionTypes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: ApiResponse<AcquisitionType[]>) => {
        const types = response.data?.map(type => ({ id: type.id, name: type.name })) || [];
        this.acquisitionTypes.set(types);
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
    this.acquisitionForm.get('productSearch')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: string) => {
        this.onProductSearchChange(value);
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.productSearchInput?.nativeElement?.focus();
    }, ACQUISITIONS_CONSTANTS.DIALOG.FOCUS_DELAY_MS);
  }

  /**
   * Loads all products for the autocomplete search.
   */
  loadProducts(): void {
    this.productsService.getAllProducts().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: ApiResponse<Product[]>) => {
        this.filteredProducts.set(response.data ?? []);
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
   * Handles changes in the product search field.
   *
   * @param value Current search value.
   */
  onProductSearchChange(value: string | Product): void {
    if (!value) {
      this.selectedProduct.set(null);
      this.isNewProduct.set(false);
      return;
    }

    if (typeof value === 'string') {
      if (value.trim() === '') {
        this.selectedProduct.set(null);
        this.isNewProduct.set(false);
        return;
      }

      const searchTerm = value.toLowerCase();
      const matchedProduct = this.filteredProducts().find(p => p.name.toLowerCase() === searchTerm);

      if (matchedProduct) {
        this.selectProduct(matchedProduct);
      } else {
        this.isNewProduct.set(true);
        this.selectedProduct.set(null);
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
    this.isNewProduct.set(false);
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
    this.isNewProduct.set(true);
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

    const productSearchValue = this.acquisitionForm.get('productSearch')?.value;
    const productName = typeof productSearchValue === 'string' 
      ? productSearchValue 
      : productSearchValue?.name || '';

    const request: CreateAcquisitionRequest = {
      acquisitionTypeOid: this.acquisitionForm.get('acquisitionTypeOid')?.value,
      productName: this.isNewProduct() 
        ? productName 
        : productName,
      description: this.isNewProduct() 
        ? this.acquisitionForm.get('newProductDescription')?.value || ''
        : undefined,
      quantity: this.isNewProduct() 
        ? this.acquisitionForm.get('newProductStock')?.value || 0
        : this.acquisitionForm.get('quantity')?.value,
      realCost: this.acquisitionForm.get('realCost')?.value,
      unitPublicCost: this.acquisitionForm.get('unitPublicCost')?.value,
      supplierName: this.acquisitionForm.get('supplierName')?.value || undefined,
      invoiceNumber: this.acquisitionForm.get('invoiceNumber')?.value || undefined,
      observations: this.acquisitionForm.get('observations')?.value || undefined
    };

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
      acquisitionTypeOid: '',
      quantity: 1,
      realCost: 0,
      unitPublicCost: 0,
      supplierName: '',
      invoiceNumber: '',
      observations: '',
      newProductDescription: '',
      newProductStock: 0,
      newProductUrlPhoto: ''
    });
    this.selectedProduct.set(null);
    this.isNewProduct.set(false);
    setTimeout(() => {
      this.productSearchInput?.nativeElement?.focus();
    }, ACQUISITIONS_CONSTANTS.DIALOG.FOCUS_DELAY_MS);
  }

  /**
   * Displays the product name in the autocomplete.
   *
   * @param product Product to display.
   * @returns Product name or empty string.
   */
  displayProduct(product?: Product): string {
    return product ? product.name : '';
  }

  /**
   * Cleanup on component destroy.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
