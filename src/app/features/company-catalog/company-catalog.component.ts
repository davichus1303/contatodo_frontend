import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { CompaniesService } from '@core/application/companies/companies.service';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { Company } from '@core/domain/models/company.model';
import { I18nService } from '@core/i18n/i18n.service';
import { displayOrFallback } from '@shared/utils/display.utils';
import { filterBySearchTerm, normalizeSearchTerm } from '@shared/utils/search.utils';

/**
 * Companies view.
 *
 * Lists the registered, non-deleted companies as cards and filters them by a
 * case-insensitive partial term matched over the company name, RFC, web site,
 * location and contact data. Create, edit, delete and status actions are shown
 * as disabled placeholders until their flows are implemented; the status toggle
 * is bound to `isActive`.
 */
@Component({
  selector: 'app-company-catalog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule
  ],
  templateUrl: './company-catalog.component.html',
  styleUrls: ['./company-catalog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyCatalogComponent {
  private readonly companiesService = inject(CompaniesService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18nService = inject(I18nService);

  readonly searchControl = new FormControl<string>('');
  readonly searchTerm = signal<string>('');
  readonly companies = signal<Company[]>([]);
  readonly isLoading = signal<boolean>(false);

  readonly filteredCompanies = computed(() =>
    filterBySearchTerm(this.companies(), this.searchTerm(), (company: Company) => [
      company.name,
      company.rfc,
      company.webSite,
      company.ubication,
      company.contactName,
      company.contactPhone
    ])
  );

  constructor() {
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string | null) => {
        this.searchTerm.set(normalizeSearchTerm(value));
      });

    this.loadCompanies();
  }

  /**
   * Loads the companies catalog from the backend.
   *
   * Only non-deleted companies are kept, so the view never lists removed
   * records even if the endpoint returns them.
   */
  loadCompanies(): void {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);

    this.companiesService.getCompanies().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response: ApiResponse<Company[]>) => {
        this.companies.set((response.data ?? []).filter((company: Company) => !company.isDeleted));
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.notifications.error(
          extractApiErrorMessage(error, this.i18nService.translate('COMPANY_CATALOG.MESSAGES.ERROR_LOADING'))
        );
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Resolves the status badge class from the active flag.
   *
   * @param isActive Company active flag.
   * @returns CSS class for the badge.
   */
  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'status-badge active' : 'status-badge inactive';
  }

  /**
   * Resolves a value to display, falling back to a localized placeholder.
   *
   * @param value Raw company field value.
   * @param fallbackKey Translation key used when the value is empty.
   * @returns The value when present, otherwise the localized placeholder.
   */
  getFieldValue(value: string | null | undefined, fallbackKey: string): string {
    return displayOrFallback(value, this.i18nService.translate(fallbackKey));
  }

  /**
   * Placeholder for the create-company flow.
   *
   * The "new company" control is disabled until that flow is implemented; the
   * binding is already in place so enabling the control is the only change
   * required.
   */
  openCreateDialog(): void {}

  /**
   * Placeholder for the edit-company flow.
   *
   * @param company Company selected for edition.
   */
  openEditDialog(company: Company): void {}

  /**
   * Placeholder for the delete-company flow.
   *
   * @param company Company selected for deletion.
   */
  onDelete(company: Company): void {}

  /**
   * Placeholder for the company status flow.
   *
   * @param company Company whose status changed.
   * @param event Slide toggle change event.
   */
  onToggleChange(company: Company, event: MatSlideToggleChange): void {}
}
