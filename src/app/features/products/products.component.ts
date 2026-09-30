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
import { MatSelectModule } from '@angular/material/select';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { Router } from '@angular/router';
import { ProductsService } from '@core/application/products/products.service';
import { CompaniesService } from '@core/application/companies/companies.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { PermissionService } from '@core/application/permissions/permission.service';
import { Product } from '@core/domain/models/product.model';
import { Company } from '@core/domain/models/company.model';
import { ProductFormComponent } from './product-form/product-form.component';
import { PermissionDirective } from '@shared/directives/permission.directive';
import { ProductFormPayload } from '@core/application/dto/product-request.dto';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { I18nService } from '@core/i18n/i18n.service';
import { openConfirmationDialog } from '@shared/utils/dialog.utils';

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
    MatSelectModule,
    ProductFormComponent,
    PermissionDirective
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsComponent {
  private readonly productsService = inject(ProductsService);
  private readonly companiesService = inject(CompaniesService);
  private readonly companySelection = inject(CompanySelectionService);
  private readonly permissionService = inject(PermissionService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  readonly i18nService = inject(I18nService);

  readonly searchControl = new FormControl<string>('');
  readonly products = signal<Product[]>([]);
  readonly searchTerm = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly sortBy = signal<'name' | 'price' | 'stock'>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly companies = signal<Company[]>([]);
  readonly companyOid = signal<string | null>(null);

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
  readonly visibleProducts = computed(() =>
    this.canSelectCompany && !this.companyOid() ? [] : this.filteredProducts()
  );

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
    this.init();
  }

  private init(): void {
    this.companyOid.set(this.companySelection.companyOid());

    if (this.canSelectCompany) {
      this.loadCompanies();
      if (this.companyOid()) {
        this.loadProducts();
      }
    } else {
      this.loadProducts();
    }
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
        this.notifications.error(this.i18nService.translate('PRODUCTS.MESSAGES.ERROR_LOADING_COMPANIES'));
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
    this.loadProducts();
  }

  loadProducts(): void {
    if (this.isLoading()) {
      return;
    }

    if (this.canSelectCompany && !this.companyOid()) {
      return;
    }

    this.isLoading.set(true);
    this.productsService.getAllProducts(this.companyOid() ?? undefined).subscribe({
      next: (response: ApiResponse<Product[]>) => {
        this.products.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.notifications.error(this.i18nService.translate('PRODUCTS.MESSAGES.ERROR_LOADING_PRODUCTS'));
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
    this.productsService
      .createProduct({ ...payload, companyOid: this.companyOid() ?? undefined })
      .subscribe({
      next: () => {
        this.isSaving.set(false);
        this.dialog.closeAll();
        this.notifications.success(this.i18nService.translate('PRODUCTS.MESSAGES.CREATED'));
        this.loadProducts();
      },
      error: (error: { error?: { message?: string; errors?: Record<string, string[]> } }) => {
        this.isSaving.set(false);
        this.notifications.error(extractApiErrorMessage(error, this.i18nService.translate('PRODUCTS.MESSAGES.ERROR_CREATING_PRODUCT')));
      }
    });
  }

  private confirmUpdate(product: Product, payload: ProductFormPayload): void {
    const confirmation = openConfirmationDialog(
      this.dialog,
      {
        titleKey: 'PRODUCTS.CONFIRMATION.TITLE',
        messageKey: 'PRODUCTS.CONFIRMATION.MESSAGE',
        cancelKey: 'PRODUCTS.CONFIRMATION.CANCEL',
        confirmKey: 'PRODUCTS.CONFIRMATION.CONFIRM'
      },
      '320px'
    );

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
        this.notifications.success(this.i18nService.translate('PRODUCTS.MESSAGES.UPDATED'));
        this.loadProducts();
      },
      error: (error: { error?: { message?: string } }) => {
        this.isSaving.set(false);
        this.notifications.error(extractApiErrorMessage(error, this.i18nService.translate('PRODUCTS.MESSAGES.ERROR_UPDATING_PRODUCT')));
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
