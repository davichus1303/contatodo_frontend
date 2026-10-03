import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@core/application/notifications/notification.service';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SalesService } from '@core/application/sales/sales.service';
import { ProductsService } from '@core/application/products/products.service';
import { CompaniesService } from '@core/application/companies/companies.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { PermissionService } from '@core/application/permissions/permission.service';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { Product } from '@core/domain/models/product.model';
import { Company } from '@core/domain/models/company.model';
import { SaleDialogComponent } from './sale-dialog/sale-dialog.component';
import { SALES_CONSTANTS } from '@shared/constants/sales.constants';
import { formatCurrency as formatCurrencyUtil } from '@shared/utils/format.utils';
import { I18nService } from '@core/i18n/i18n.service';

/**
 * Sales page component.
 */
@Component({
  selector: 'app-sales',
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
    MatFormFieldModule
  ],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesComponent implements OnInit {
  readonly products = signal<Product[]>([]);
  readonly filteredProducts = signal<Product[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly companies = signal<Company[]>([]);
  readonly companyOid = signal<string | null>(null);
  searchControl: FormGroup;
  readonly i18nService = inject(I18nService);

  /**
   * Whether the session may choose the owning company.
   *
   * Only a root session sees the selector: it carries no company claim, so the
   * company has to be picked explicitly. Every other session is already scoped
   * to its own company by the backend and must not choose another one.
   */
  readonly canSelectCompany = this.permissionService.isRoot();

  /**
   * Products to render. A root session has nothing to show until a company is
   * selected, because the backend rejects an unscoped query.
   */
  readonly visibleProducts = computed(() => (this.canSelectCompany && !this.companyOid() ? [] : this.filteredProducts()));

  constructor(
    private salesService: SalesService,
    private productsService: ProductsService,
    private companiesService: CompaniesService,
    private companySelection: CompanySelectionService,
    private permissionService: PermissionService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private notifications: NotificationService,
    private router: Router,
    private destroyRef: DestroyRef
  ) {
    this.searchControl = this.fb.group({
      search: ['']
    });
  }

  /**
   * Initializes the component.
   */
  ngOnInit(): void {
    this.companyOid.set(this.companySelection.companyOid());

    if (this.canSelectCompany) {
      this.loadCompanies();
      if (this.companyOid()) {
        this.loadProducts();
      }
    } else {
      this.loadProducts();
    }

    this.searchControl.get('search')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.filterProducts(value);
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
        this.notifications.error(SALES_CONSTANTS.MESSAGES.ERROR_LOADING_COMPANIES);
      }
    });
  }

  /**
   * Handles a company selection and reloads the product list for that company.
   *
   * @param companyOid Selected company identifier, or an empty value to clear.
   */
  onCompanySelected(companyOid: string | null): void {
    this.companyOid.set(companyOid);
    this.companySelection.select(companyOid);
    this.searchControl.reset();
    this.loadProducts();
  }

  /**
   * Loads available products from the backend.
   *
   * A root session scopes the query to the selected company; every other
   * session relies on the company claim carried by its own token.
   */
  public loadProducts(): void {
    this.isLoading.set(true);
    this.productsService.getAvailableProducts(this.companyOid() ?? undefined).subscribe({
      next: (response: ApiResponse<Product[]>) => {
        this.products.set(response.data ?? []);
        this.filteredProducts.set([...this.products()]);
        this.isLoading.set(false);
      },
      error: () => {
        this.notifications.error(SALES_CONSTANTS.MESSAGES.ERROR_LOADING_PRODUCTS);
        this.isLoading.set(false);
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
      this.filteredProducts.set([...this.products()]);
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredProducts.set(this.products().filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.code.toLowerCase().includes(term)
    ));
  }

  /**
   * Opens the sale dialog for a selected product.
   *
   * @param product Product to sell.
   */
  openSaleDialog(product: Product): void {
    const dialogRef = this.dialog.open(SaleDialogComponent, {
      width: '400px',
      data: { product, companyOid: this.companyOid() }
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (result) {
          this.searchControl.reset();
          this.loadProducts();
          this.notifications.success(SALES_CONSTANTS.MESSAGES.SALE_CREATED_SUCCESSFULLY);
        }
      });
  }

  /**
   * @description Formats a number as currency.
   *
   * @param value Number to format.
   * @returns Formatted currency string.
   */
  formatCurrency(value: number): string {
    return formatCurrencyUtil(value);
  }

  /**
   * Navigates to sales history page.
   */
  goToSalesHistory(): void {
    this.router.navigate(['/sales-history']);
  }
}
