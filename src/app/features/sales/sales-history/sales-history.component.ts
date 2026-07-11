import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { SalesService } from '../sales.service';
import { Sale } from '../../../shared/models/sale.model';
import { GENERAL_CONSTANTS } from '../../../shared/constants/general.constants';

/**
 * Sales History page component.
 */
@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './sales-history.component.html',
  styleUrls: ['./sales-history.component.scss']
})
export class SalesHistoryComponent implements OnInit {
  sales: Sale[] = [];
  filteredSales: Sale[] = [];
  dateRangeForm: FormGroup;
  searchControl: FormGroup;
  isLoading = false;
  summary = {
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0
  };

  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  constructor() {
    const today = new Date();
    this.dateRangeForm = this.fb.group({
      startDate: [today, Validators.required],
      endDate: [today, Validators.required]
    });

    this.searchControl = this.fb.group({
      search: ['']
    });
  }

  /**
   * Initializes the component.
   */
  ngOnInit(): void {
    this.loadSales();
    this.searchControl.get('search')?.valueChanges.subscribe(value => {
      this.filterSales(value);
    });
  }

  /**
   * Loads sales for the selected date range.
   */
  public loadSales(): void {
    if (this.dateRangeForm.invalid) {
      return;
    }

    this.isLoading = true;
    const startDate = this.dateRangeForm.get('startDate')?.value;
    const endDate = this.dateRangeForm.get('endDate')?.value;

    this.salesService.getSalesByDateRange(startDate, endDate).subscribe({
      next: (response: any) => {
        this.sales = response.data || [];
        this.filteredSales = [...this.sales];
        this.calculateSummary();
        this.isLoading = false;
      },
      error: (error: any) => {
        this.snackBar.open(
          'Error cargando ventas',
          'Cerrar',
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
        this.isLoading = false;
      }
    });
  }

  /**
   * Filters sales based on search term.
   *
   * @param searchTerm Search term.
   */
  filterSales(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredSales = [...this.sales];
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredSales = this.sales.filter(sale =>
      sale.productName?.toLowerCase().includes(term)
    );
  }

  /**
   * Calculates summary statistics.
   */
  private calculateSummary(): void {
    this.summary = {
      totalSales: this.sales.length,
      totalRevenue: this.sales.reduce((sum, sale) => sum + (sale.totalSalePrice || 0), 0),
      totalProfit: this.sales.reduce((sum, sale) => {
        const profit = (sale.totalSalePrice || 0) - (sale.totalCost || 0);
        return sum + profit;
      }, 0)
    };
  }

  /**
   * Calculates profit for a sale.
   *
   * @param sale Sale data.
   * @returns Profit value.
   */
  calculateProfit(sale: Sale): number {
    return (sale.totalSalePrice || 0) - (sale.totalCost || 0);
  }

  /**
   * Gets profit color class.
   *
   * @param profit Profit value.
   * @returns CSS class.
   */
  getProfitColorClass(profit: number): string {
    if (profit > 0) return 'profit-positive';
    if (profit < 0) return 'profit-negative';
    return 'profit-neutral';
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
   * Navigates back to sales page.
   */
  goToNewSale(): void {
    this.router.navigate(['/sales']);
  }

  /**
   * Handles search button click.
   */
  onSearch(): void {
    this.loadSales();
  }
}
