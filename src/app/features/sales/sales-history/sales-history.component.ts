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
import { AcquisitionsService } from '../../acquisitions/acquisitions.service';
import { Sale } from '../../../shared/models/sale.model';
import { Acquisition } from '../../../shared/models/acquisition.model';
import { I18nService } from '../../../shared/utils/i18n.util';
import { GENERAL_CONSTANTS } from '../../../shared/constants/general.constants';
import { SALES_HISTORY_CONSTANTS } from './sales-history.constants';

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
  acquisitions: Acquisition[] = [];
  dateRangeForm: FormGroup;
  searchControl: FormGroup;
  isLoading = false;
  summary = {
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalExpenses: 0,
    grossProfit: 0
  };

  private salesService = inject(SalesService);
  private acquisitionsService = inject(AcquisitionsService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  readonly i18nService = inject(I18nService);

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

    const formattedStartDate = this.getFormatedDate(startDate);
    const formattedEndDate = this.getFormatedDate(endDate, SALES_HISTORY_CONSTANTS.DATE.DEFAULT_END_TIME);
    
    this.salesService.getSalesByDateRange(formattedStartDate, formattedEndDate).subscribe({
      next: (response: any) => {
        this.sales = response.data || [];
        this.filteredSales = [...this.sales];
        this.loadAcquisitions(formattedStartDate, formattedEndDate);
      },
      error: (error: any) => {
        this.snackBar.open(
          this.i18nService.translate('SALES_HISTORY.ERROR_LOADING_SALES'),
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
        this.isLoading = false;
      }
    });
  }

  /**
   * Formats a date to the required format for the API.
   * @param date The date to format.
   * @param defaultTime The default time to use if no time is provided.
   * @returns The formatted date.
   */
  private getFormatedDate(date: Date, defaultTime: string = SALES_HISTORY_CONSTANTS.DATE.DEFAULT_START_TIME): Date {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(SALES_HISTORY_CONSTANTS.DATE.MONTH_PADDING, SALES_HISTORY_CONSTANTS.STRING_ZERO);
    const day = String(date.getDate()).padStart(SALES_HISTORY_CONSTANTS.DATE.DAY_PADDING, SALES_HISTORY_CONSTANTS.STRING_ZERO);
    const datePart = `${year}${SALES_HISTORY_CONSTANTS.DATE.DATE_SEPARATOR}${month}${SALES_HISTORY_CONSTANTS.DATE.DATE_SEPARATOR}${day}`;
    const timePart = defaultTime;
    return new Date(`${datePart}${SALES_HISTORY_CONSTANTS.DATE.DATE_TIME_SEPARATOR}${timePart}`);
  }

  /**
   * Loads acquisitions for the selected date range.
   */
  private loadAcquisitions(startDate: Date, endDate: Date): void {
    this.acquisitionsService.getAcquisitions(startDate, endDate).subscribe({
      next: (response: any) => {
        this.acquisitions = response.data || [];
        this.calculateSummary();
        this.isLoading = false;
      },
      error: (error: any) => {
        this.snackBar.open(
          this.i18nService.translate('SALES_HISTORY.ERROR_LOADING_ACQUISITIONS'),
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
        this.acquisitions = [];
        this.calculateSummary();
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
    const totalProfit = this.sales.reduce((sum, sale) => {
      const profit = (sale.totalSalePrice || 0) - (sale.totalCost || 0);
      return sum + profit;
    }, 0);

    const totalExpenses = this.acquisitions
      .filter((acquisition: Acquisition) => acquisition.productName && acquisition.productName !== 'Unknown' && acquisition.productName !== '0')
      .reduce((sum: number, acquisition: Acquisition) => sum + acquisition.realCost, 0);

    this.summary = {
      totalSales: this.sales.length,
      totalRevenue: this.sales.reduce((sum, sale) => sum + (sale.totalSalePrice || 0), 0),
      totalProfit: totalProfit,
      totalExpenses: totalExpenses,
      grossProfit: totalProfit - totalExpenses
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
