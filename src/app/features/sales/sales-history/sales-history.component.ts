import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NotificationService } from '@core/application/notifications/notification.service';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SalesService } from '@core/application/sales/sales.service';
import { ExpensesService } from '@core/application/expenses/expenses.service';
import { CompaniesService } from '@core/application/companies/companies.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { PermissionService } from '@core/application/permissions/permission.service';
import { Sale } from '@core/domain/models/sale.model';
import { Company } from '@core/domain/models/company.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { TotalExpensesResponse } from '@core/application/expenses/expenses.service';
import { I18nService } from '@core/i18n/i18n.service';
import { formatCurrency as formatCurrencyUtil, formatDateISO } from '@shared/utils/format.utils';
import { calculateProfit as calculateProfitUtil, getProfitColorClass as getProfitColorClassUtil } from '../sales.utils';
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
    MatSelectModule,
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
  readonly companies = signal<Company[]>([]);
  readonly companyOid = signal<string | null>(null);
  readonly summary = signal<HistorySummary>({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalExpenses: 0,
    grossProfit: 0,
    profitBeforeTaxes: 0
  });

  private readonly permissionService = inject(PermissionService);

  /**
   * Whether the session may choose the owning company.
   *
   * Only a root session sees the selector: it carries no company claim, so the
   * company has to be picked explicitly. Every other session is already scoped
   * to its own company by the backend and must not choose another one.
   */
  readonly canSelectCompany = this.permissionService.isRoot();

  dateRangeForm: FormGroup;
  searchControl: FormGroup;

  private salesService = inject(SalesService);
  private expensesService = inject(ExpensesService);
  private companiesService = inject(CompaniesService);
  private companySelection = inject(CompanySelectionService);
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
   *
   * <p>The history inherits the company picked on the sales page: when one is
   * available the sales load right away. Without an inherited company a root
   * session defers the load until a company is chosen in the selector; any
   * other session relies on the company claim carried by its own token.</p>
   */
  ngOnInit(): void {
    this.companyOid.set(this.companySelection.companyOid());

    if (this.canSelectCompany) {
      this.loadCompanies();
    }

    if (!this.canSelectCompany || this.companyOid()) {
      this.loadSales();
    }

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
   * Loads the active, non-deleted companies available to a root session.
   */
  private loadCompanies(): void {
    this.companiesService.getActiveCompanies().subscribe({
      next: (response: ApiResponse<Company[]>) => {
        this.companies.set(response.data ?? []);
      },
      error: () => {
        this.notifications.error(this.i18nService.translate('sales.errorLoadingCompanies'));
      }
    });
  }

  /**
   * Handles a company selection and reloads the history for that company.
   *
   * @param companyOid Selected company identifier, or an empty value to clear.
   */
  onCompanySelected(companyOid: string | null): void {
    this.companyOid.set(companyOid);
    this.companySelection.select(companyOid);
    this.loadSales();
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

    this.salesService.getSalesByDateRange(formattedStartDate, formattedEndDate, this.companyOid() ?? undefined).subscribe({
      next: (response: ApiResponse<Sale[]>) => {
        this.sales.set(response.data || []);
        this.filteredSales.set([...this.sales()]);
        this.loadTotalExpenses();
      },
      error: () => {
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
    const datePart = formatDateISO(date);
    const timePart = defaultTime;
    return new Date(`${datePart}${SALES_HISTORY_CONSTANTS.DATE.DATE_TIME_SEPARATOR}${timePart}`);
  }

  /**
   * Formats a date as YYYY-MM-DD string for the expenses API.
   * @param date Date to format.
   * @returns Formatted date string.
   */
  private formatDateForApi(date: Date): string {
    return formatDateISO(date);
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
      next: (response: ApiResponse<TotalExpensesResponse>) => {
        this.rebuildSummary(response.data?.total || 0);
        this.isLoading.set(false);
      },
      error: () => {
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
      const profit = calculateProfitUtil(sale.totalSalePrice, sale.totalCost);
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
    return calculateProfitUtil(sale.totalSalePrice, sale.totalCost);
  }

  /**
   * Gets profit color class.
   *
   * @param profit Profit value.
   * @returns CSS class.
   */
  getProfitColorClass(profit: number): string {
    return getProfitColorClassUtil(profit);
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
