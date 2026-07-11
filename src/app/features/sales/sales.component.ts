import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { SalesService } from './sales.service';
import { ProductsService } from '../products/products.service';
import { Product } from '../../shared/models/product.model';
import { SaleDialogComponent } from './sale-dialog/sale-dialog.component';
import { SALES_CONSTANTS } from '../../shared/constants/sales.constants';
import { GENERAL_CONSTANTS } from '../../shared/constants/general.constants';

/**
 * Sales page component.
 */
@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss']
})
export class SalesComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchControl: FormGroup;
  isLoading = false;

  constructor(
    private salesService: SalesService,
    private productsService: ProductsService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.searchControl = this.fb.group({
      search: ['']
    });
  }

  /**
   * Initializes the component.
   */
  ngOnInit(): void {
    this.loadProducts();
    this.searchControl.get('search')?.valueChanges.subscribe(value => {
      this.filterProducts(value);
    });
  }

  /**
   * Loads available products from the backend.
   */
  public loadProducts(): void {
    this.isLoading = true;
    this.productsService.getAvailableProducts().subscribe({
      next: (response: any) => {
        this.products = response.data;
        this.filteredProducts = [...this.products];
        this.isLoading = false;
      },
      error: (error: any) => {
        this.snackBar.open(
          SALES_CONSTANTS.MESSAGES.ERROR_LOADING_PRODUCTS,
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
        this.isLoading = false;
      }
    });
  }

  /**
   * Filters products based on search term.
   *
   * @param searchTerm Search term.
   */
  filterProducts(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredProducts = [...this.products];
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredProducts = this.products.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.code.toLowerCase().includes(term)
    );
  }

  /**
   * Opens the sale dialog for a selected product.
   *
   * @param product Product to sell.
   */
  openSaleDialog(product: Product): void {
    const dialogRef = this.dialog.open(SaleDialogComponent, {
      width: '400px',
      data: { product }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProducts();
        this.snackBar.open(
          SALES_CONSTANTS.MESSAGES.SALE_CREATED_SUCCESSFULLY,
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
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
    return new Intl.NumberFormat(
      GENERAL_CONSTANTS.CURRENCY.LOCALE,
      {
        style: 'currency',
        currency: GENERAL_CONSTANTS.CURRENCY.CURRENCY_CODE
      }
    ).format(value);
  }

  /**
   * Navigates to sales history page.
   */
  goToSalesHistory(): void {
    this.router.navigate(['/sales-history']);
  }
}
