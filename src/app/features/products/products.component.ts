import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ProductsService } from './products.service';
import { Product } from '../../shared/models/product.model';
import { ProductFormComponent } from './product-form/product-form.component';
import { ProductFormPayload } from '../../shared/dto/product-request.dto';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { I18nService } from '../../shared/utils/i18n.util';
import { GENERAL_CONSTANTS } from '../../shared/constants/general.constants';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ProductFormComponent
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsComponent {
  private readonly productsService = inject(ProductsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  readonly i18nService = inject(I18nService);

  readonly searchControl = new FormControl<string>('');
  readonly products = signal<Product[]>([]);
  readonly searchTerm = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly sortBy = signal<'name' | 'price' | 'stock'>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const source = [...this.products()];
    const filtered = term
      ? source.filter((product: Product) => product.name.toLowerCase().includes(term))
      : source;

    return [...filtered].sort((left: Product, right: Product) => {
      let comparison = 0;
      if (this.sortBy() === 'price') {
        comparison = left.unitPublicCost - right.unitPublicCost;
      } else if (this.sortBy() === 'stock') {
        comparison = left.stock - right.stock;
      } else {
        comparison = left.name.localeCompare(right.name);
      }
      return this.sortDirection() === 'asc' ? comparison : -comparison;
    });
  });

  constructor() {
    this.searchControl.valueChanges.subscribe((value: string | null) => {
      this.searchTerm.set(value?.trim().toLowerCase() ?? '');
    });
    this.loadProducts();
  }

  loadProducts(): void {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.productsService.getAllProducts().subscribe({
      next: (response: ApiResponse<Product[]>) => {
        this.products.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open(
          this.i18nService.translate('PRODUCTS.MESSAGES.ERROR_LOADING_PRODUCTS'),
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
        this.isLoading.set(false);
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ProductFormComponent, {
      width: 'min(90vw, 720px)',
      data: { isEdit: false }
    });

    dialogRef.componentInstance.formSubmit.subscribe((payload: ProductFormPayload) => {
      this.createProduct(payload);
    });
  }

  openEditDialog(product: Product): void {
    const dialogRef = this.dialog.open(ProductFormComponent, {
      width: 'min(90vw, 720px)',
      data: { isEdit: true, product }
    });

    dialogRef.componentInstance.formSubmit.subscribe((payload: ProductFormPayload) => {
      this.confirmUpdate(product, payload);
    });
  }

  private createProduct(payload: ProductFormPayload): void {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.productsService.createProduct(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.dialog.closeAll();
        this.snackBar.open(this.i18nService.translate('PRODUCTS.MESSAGES.CREATED'), GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON, { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION });
        this.loadProducts();
      },
      error: (error: { error?: { message?: string; errors?: Record<string, string[]> } }) => {
        this.isSaving.set(false);
        this.snackBar.open(error.error?.message ?? this.i18nService.translate('PRODUCTS.MESSAGES.ERROR_CREATING_PRODUCT'), GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON, { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION });
      }
    });
  }

  private confirmUpdate(product: Product, payload: ProductFormPayload): void {
    const confirmation = this.dialog.open(ConfirmationDialogComponent, {
      width: '320px',
      data: { productName: product.name }
    });

    confirmation.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.updateProduct(product.id, payload);
      }
    });
  }

  private updateProduct(id: string, payload: ProductFormPayload): void {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.productsService.updateProduct(id, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.dialog.closeAll();
        this.snackBar.open(this.i18nService.translate('PRODUCTS.MESSAGES.UPDATED'), GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON, { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION });
        this.loadProducts();
      },
      error: (error: { error?: { message?: string } }) => {
        this.isSaving.set(false);
        this.snackBar.open(error.error?.message ?? this.i18nService.translate('PRODUCTS.MESSAGES.ERROR_UPDATING_PRODUCT'), GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON, { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION });
      }
    });
  }

  setSort(sortBy: 'name' | 'price' | 'stock'): void {
    if (this.sortBy() === sortBy) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortBy.set(sortBy);
    this.sortDirection.set('asc');
  }

  goToSales(): void {
    this.router.navigate(['/sales']);
  }
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ i18nService.translate('PRODUCTS.CONFIRMATION.TITLE') }}</h2>
    <mat-dialog-content>
      <p>{{ i18nService.translate('PRODUCTS.CONFIRMATION.MESSAGE') }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ i18nService.translate('PRODUCTS.CONFIRMATION.CANCEL') }}</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="true">{{ i18nService.translate('PRODUCTS.CONFIRMATION.CONFIRM') }}</button>
    </mat-dialog-actions>
  `
})
export class ConfirmationDialogComponent {
  readonly i18nService = inject(I18nService);
}
