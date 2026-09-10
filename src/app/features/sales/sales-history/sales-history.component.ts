import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NotificationService } from '@core/application/notifications/notification.service';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SalesService } from '@core/application/sales/sales.service';
import { ExpensesService } from '@core/application/expenses/expenses.service';
import { Sale } from '@core/domain/models/sale.model';
import { I18nService } from '@core/i18n/i18n.service';
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';
import { SALES_HISTORY_CONSTANTS } from './sales-history.constants';

/** Aggregated metrics shown in the summary panel. */
interface HistorySummary {
  readonly totalSales: number;
  readonly totalRevenue: number;
  readonly totalProfit: number;
  readonly totalExpenses: number;
  readonly grossProfit: number;
  readonly profitBeforeTaxes: number;
}

/**
 * Sales History page component.
 */
@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [
    CommonModule,
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
  styleUrls: ['./sales-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesHistoryComponent implements OnInit {
  readonly sales = signal<Sale[]>([]);
  readonly filteredSales = signal<Sale[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly summary = signal<HistorySummary>({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalExpenses: 0,
    grossProfit: 0,
    profitBeforeTaxes: 0
  });

  dateRangeForm: FormGroup;
  searchControl: FormGroup;

  private salesService = inject(SalesService);
  private expensesService = inject(ExpensesService);
  private fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
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
    this.searchControl.get('search')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.filterSales(value);
      });

    // Reload total expenses when date range changes
    this.dateRangeForm.get('startDate')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.sales().length > 0) {
          this.loadTotalExpenses();
        }
      });
    this.dateRangeForm.get('endDate')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.sales().length > 0) {
          this.loadTotalExpenses();
        }
      });
  }

  /**
   * Loads sales for the selected date range.
   */
  public loadSales(): void {
    if (this.dateRangeForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    const startDate = this.dateRangeForm.get('startDate')?.value;
    const endDate = this.dateRangeForm.get('endDate')?.value;

    const formattedStartDate = this.getFormatedDate(startDate);
    const formattedEndDate = this.getFormatedDate(endDate, SALES_HISTORY_CONSTANTS.DATE.DEFAULT_END_TIME);

    this.salesService.getSalesByDateRange(formattedStartDate, formattedEndDate).subscribe({
      next: (response: any) => {
        this.sales.set(response.data || []);
        this.filteredSales.set([...this.sales()]);
        this.loadTotalExpenses();
      },
      error: (error: any) => {
        this.notifications.error(this.i18nService.translate('SALES_HISTORY.ERROR_LOADING_SALES'));
        this.isLoading.set(false);
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
   * Formats a date as YYYY-MM-DD string for the expenses API.
   * @param date Date to format.
   * @returns Formatted date string.
   */
  private formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Loads total expenses for the selected date range using the new backend endpoint.
   */
  private loadTotalExpenses(): void {
    const startDate = this.dateRangeForm.get('startDate')?.value;
    const endDate = this.dateRangeForm.get('endDate')?.value;

    const startDateStr = this.formatDateForApi(startDate);
    const endDateStr = this.formatDateForApi(endDate);

    this.expensesService.getTotalExpensesByDateRange({
      startDate: startDateStr,
      endDate: endDateStr
    }).subscribe({
      next: (response: any) => {
        this.rebuildSummary(response.data?.total || 0);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        this.notifications.error(this.i18nService.translate('SALES_HISTORY.ERROR_LOADING_EXPENSES'));
        this.rebuildSummary(0);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Recomputes the summary panel from the loaded sales and the given expenses.
   *
   * @param totalExpenses Total expenses for the selected range.
   */
  private rebuildSummary(totalExpenses: number): void {
    const sales = this.sales();

    const totalProfit = sales.reduce((sum, sale) => {
      const profit = (sale.totalSalePrice || 0) - (sale.totalCost || 0);
      return sum + profit;
    }, 0);

    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalSalePrice || 0), 0);

    // Gross Profit is the profit after considering the real cost of products sold
    const grossProfit = totalProfit;

    // Profit Before Taxes = Gross Profit - Total Expenses
    const profitBeforeTaxes = grossProfit - totalExpenses;

    this.summary.set({
      totalSales: sales.length,
      totalRevenue: totalRevenue,
      totalProfit: totalProfit,
      totalExpenses: totalExpenses,
      grossProfit: grossProfit,
      profitBeforeTaxes: profitBeforeTaxes
    });
  }

  /**
   * Filters sales based on search term.
   *
   * @param searchTerm Search term.
   */
  filterSales(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredSales.set([...this.sales()]);
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredSales.set(this.sales().filter(sale =>
      sale.productName?.toLowerCase().includes(term)
    ));
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
