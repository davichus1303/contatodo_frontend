import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DealsService } from '@core/application/deals/deals.service';
import { Deal } from '@core/domain/models/deal.model';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { I18nService } from '@core/i18n/i18n.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { PermissionService } from '@core/application/permissions/permission.service';
import { CompaniesService } from '@core/application/companies/companies.service';
import { Company } from '@core/domain/models/company.model';
import { ProductsService } from '@core/application/products/products.service';
import { Product } from '@core/domain/models/product.model';
import { UnitOfMeasureCatalogService } from '@core/application/unit-of-measures/unit-of-measure-catalog.service';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';
import { UpdateDealRequest } from '@core/application/dto/deal-request.dto';
import { PermissionDirective } from '@shared/directives/permission.directive';
import { openConfirmationDialog } from '@shared/utils/dialog.utils';
import { DealDialogComponent } from './deal-dialog/deal-dialog.component';
import { DealDeleteDialogComponent } from './deal-delete-dialog/deal-delete-dialog.component';

@Component({
  selector: 'app-deals-catalog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    PermissionDirective
  ],
  templateUrl: './deals-catalog.component.html',
  styleUrls: ['./deals-catalog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DealsCatalogComponent {
  private readonly dealsService = inject(DealsService);
  private readonly productsService = inject(ProductsService);
  private readonly unitOfMeasureCatalog = inject(UnitOfMeasureCatalogService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  readonly i18nService = inject(I18nService);
  private readonly companySelectionService = inject(CompanySelectionService);
  private readonly permissionService = inject(PermissionService);
  private readonly companiesService = inject(CompaniesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl<string>('');
  readonly searchTerm = signal<string>('');
  readonly deals = signal<Deal[]>([]);
  readonly products = signal<Product[]>([]);
  readonly units = signal<UnitOfMeasure[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly updatingIds = signal<Set<string>>(new Set());
  readonly companies = signal<Company[]>([]);
  readonly companyOid = signal<string | null>(null);

  readonly canSelectCompany = this.permissionService.isRoot();

  readonly filteredDeals = computed(() => {
    const searchTerm = this.searchTerm().toLowerCase();
    const filtered = this.deals().filter((deal) => {
      const productName = this.getProductName(deal.productOid).toLowerCase();
      const unitName = this.getUnitName(deal.unitOfMeasureOid).toLowerCase();
      return productName.includes(searchTerm) || unitName.includes(searchTerm);
    });
    filtered.sort((a, b) => this.getProductName(a.productOid).localeCompare(this.getProductName(b.productOid)));
    return filtered;
  });

  constructor() {
    this.searchTerm.set(this.searchControl.value ?? '');
    this.searchControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value: string | null) => {
      this.searchTerm.set(value ?? '');
    });
    this.init();
  }

  /**
   * Initializes the catalog state and loads required data.
   */
  private init(): void {
    this.companyOid.set(this.companySelectionService.companyOid());
    if (this.canSelectCompany) {
      this.loadCompanies();
      if (this.companyOid()) {
        this.loadData();
      }
    } else {
      this.loadData();
    }
  }

  /**
   * Loads active companies available for root company selection.
   */
  private loadCompanies(): void {
    this.companiesService.getActiveCompanies().subscribe({
      next: (response) => {
        this.companies.set(response.data ?? []);
      },
      error: () => {
        this.notifications.error(this.i18nService.translate('DEALS_CATALOG.MESSAGES.ERROR_LOADING_COMPANIES'));
      }
    });
  }

  /**
   * Handles company selection changes and reloads catalog data accordingly.
   *
   * @param companyOid Selected company identifier, or null to clear selection.
   */
  onCompanySelected(companyOid: string | null): void {
    this.companyOid.set(companyOid);
    this.companySelectionService.select(companyOid);
    if (companyOid || !this.canSelectCompany) {
      this.loadData();
    } else {
      this.deals.set([]);
      this.products.set([]);
      this.units.set([]);
    }
  }

  /**
   * Loads deals, products, and units for the active company context.
   */
  private loadData(): void {
    if (this.isLoading()) {
      return;
    }
    if (this.canSelectCompany && !this.companyOid()) {
      return;
    }

    this.isLoading.set(true);
    const companyOid = this.canSelectCompany ? this.companyOid() ?? undefined : undefined;

    forkJoin({
      deals: this.dealsService.getDeals(companyOid),
      products: this.productsService.getAllProducts(companyOid),
      units: this.unitOfMeasureCatalog.getHistoricalUnits(companyOid)
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ deals, products, units }) => {
        this.deals.set(deals.data ?? []);
        this.products.set(products.data ?? []);
        this.units.set(units ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.notifications.error(this.i18nService.translate('DEALS_CATALOG.MESSAGES.ERROR_LOADING'));
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Opens the dialog to create a new deal.
   */
  openCreateDialog(): void {
    const dialogRef = this.dialog.open(DealDialogComponent, {
      width: '480px',
      data: {
        mode: 'create',
        products: this.products(),
        units: this.units(),
        companyOid: this.companyOid()
      }
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((saved: boolean | undefined) => {
      if (saved) {
        this.loadData();
      }
    });
  }

  /**
   * Opens the dialog to edit an existing deal.
   *
   * @param deal Deal to edit.
   */
  openEditDialog(deal: Deal): void {
    const dialogRef = this.dialog.open(DealDialogComponent, {
      width: '480px',
      data: {
        mode: 'edit',
        deal,
        products: this.products(),
        units: this.units(),
        companyOid: this.companyOid()
      }
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((saved: boolean | undefined) => {
      if (saved) {
        this.loadData();
      }
    });
  }

  /**
   * Opens the dialog to delete a deal.
   *
   * @param deal Deal to delete.
   */
  openDeleteDialog(deal: Deal): void {
    const dialogRef = this.dialog.open(DealDeleteDialogComponent, {
      width: '360px',
      data: { deal, productName: this.getProductName(deal.productOid) }
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((deleted: boolean | undefined) => {
      if (deleted) {
        this.loadData();
      }
    });
  }

  /**
   * Handles activation/deactivation toggle requests for a deal.
   *
   * @param deal Deal being updated.
   * @param event Toggle change event.
   */
  onStatusToggle(deal: Deal, event: MatSlideToggleChange): void {
    const previousValue = deal.isActive;
    const newValue = event.checked;

    if (this.updatingIds().has(deal.id)) {
      event.source.checked = previousValue;
      return;
    }

    event.source.checked = previousValue;

    const dialogRef = openConfirmationDialog(
      this.dialog,
      {
        titleKey: newValue ? 'DEALS_CATALOG.CONFIRM_ACTIVATE_TITLE' : 'DEALS_CATALOG.CONFIRM_DEACTIVATE_TITLE',
        messageKey: newValue ? 'DEALS_CATALOG.CONFIRM_ACTIVATE_MESSAGE' : 'DEALS_CATALOG.CONFIRM_DEACTIVATE_MESSAGE',
        cancelKey: 'DEALS_CATALOG.ACTIONS.CANCEL',
        confirmKey: newValue ? 'DEALS_CATALOG.ACTIONS.ACTIVATE' : 'DEALS_CATALOG.ACTIONS.DEACTIVATE'
      },
      '420px'
    );

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed?: boolean) => {
      if (!confirmed) {
        event.source.checked = previousValue;
        return;
      }

      event.source.checked = newValue;
      this.updatingIds.update((set) => {
        const nextSet = new Set(set);
        nextSet.add(deal.id);
        return nextSet;
      });

      const payload: UpdateDealRequest = { isActive: newValue };

      this.dealsService.updateDeal(deal.id, payload).subscribe({
        next: () => {
          this.deals.update((deals) => deals.map((current) =>
            current.id === deal.id ? { ...current, isActive: newValue } : current
          ));
          this.updatingIds.update((set) => {
            const nextSet = new Set(set);
            nextSet.delete(deal.id);
            return nextSet;
          });
          this.notifications.success(this.i18nService.translate('DEALS_CATALOG.MESSAGES.STATUS_UPDATED'));
        },
        error: (error) => {
          event.source.checked = previousValue;
          this.updatingIds.update((set) => {
            const nextSet = new Set(set);
            nextSet.delete(deal.id);
            return nextSet;
          });
          this.notifications.error(extractApiErrorMessage(error, this.i18nService.translate('DEALS_CATALOG.MESSAGES.ERROR_UPDATING_STATUS')));
        }
      });
    });
  }

  /**
   * Returns the CSS class for a deal status badge.
   *
   * @param isActive Whether the deal is active.
   * @returns Badge class name.
   */
  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'status-badge active' : 'status-badge inactive';
  }

  /**
   * Resolves a product name for display.
   *
   * @param productOid Product identifier.
   * @returns Product name, or the identifier when unavailable.
   */
  getProductName(productOid: string): string {
    return this.products().find((product) => product.id === productOid)?.name ?? productOid;
  }

  /**
   * Resolves a unit of measure label for display.
   *
   * @param unitOfMeasureOid Unit of measure identifier.
   * @returns Unit label, or the identifier when unavailable.
   */
  getUnitName(unitOfMeasureOid: string): string {
    const unit = this.units().find((current) => current.id === unitOfMeasureOid);
    return unit ? `${unit.name} (${unit.abrev})` : unitOfMeasureOid;
  }

  /**
   * Checks whether a deal status update is in progress.
   *
   * @param dealId Deal identifier.
   * @returns `true` when the deal is currently being updated.
   */
  isUpdating(dealId: string): boolean {
    return this.updatingIds().has(dealId);
  }

  /**
   * Indicates whether deal creation should be disabled.
   *
   * @returns `true` when a root user has not selected a company.
   */
  isCreateDisabled(): boolean {
    return this.canSelectCompany && !this.companyOid();
  }
}
