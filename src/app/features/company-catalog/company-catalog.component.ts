import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { CompaniesService } from '@core/application/companies/companies.service';
import { resolveContactPhoneUpdate, toCreateCompanyRequest } from '@core/application/companies/company-request.mapper';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { CreateCompaniesRequest, UpdateCompanyRequest } from '@core/application/dto/company-request.dto';
import { UsersService } from '@core/application/users/users.service';
import { Company } from '@core/domain/models/company.model';
import { User } from '@core/domain/models/user.model';
import { I18nService } from '@core/i18n/i18n.service';
import { openConfirmationDialog } from '@shared/utils/dialog.utils';
import { displayOrFallback } from '@shared/utils/display.utils';
import { addPendingId, removePendingId } from '@shared/utils/pending-ids.utils';
import { filterBySearchTerm, normalizeSearchTerm } from '@shared/utils/search.utils';
import { CompanyDialogComponent, CompanyDialogData } from './company-dialog/company-dialog.component';
import { CompanyFormModel } from './company-dialog/company-form.model';

/**
 * Companies view.
 *
 * Lists the registered, non-deleted companies as cards and filters them by a
 * case-insensitive partial term matched over the company name, RFC, web site,
 * location and contact data. The status toggle activates or deactivates a
 * company through a confirmation dialog and the create action opens the
 * reusable company dialog; edit and delete actions are shown as disabled
 * placeholders until their flows are implemented.
 */
@Component({
  selector: 'app-company-catalog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
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
  private readonly usersService = inject(UsersService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18nService = inject(I18nService);

  readonly searchControl = new FormControl<string>('');
  readonly searchTerm = signal<string>('');
  readonly companies = signal<Company[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly updatingIds = signal<Set<string>>(new Set());

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
   * Checks whether the status update of a company is currently pending.
   *
   * @param id Company identifier.
   * @returns True when the company status request is in flight.
   */
  isUpdating(id: string): boolean {
    return this.updatingIds().has(id);
  }

  /**
   * Opens the confirmation dialog when a company status toggle changes.
   *
   * Activating or deactivating a company is confirmed first. If the dialog is
   * cancelled the catalog is reloaded to revert the toggle; when confirmed, the
   * new status is sent to the backend.
   *
   * @param company Company whose status changed.
   * @param event Slide toggle change event.
   */
  onToggleChange(company: Company, event: MatSlideToggleChange): void {
    const activating = event.checked;

    const dialogRef = openConfirmationDialog(
      this.dialog,
      {
        titleKey: activating
          ? 'COMPANY_CATALOG.MESSAGES.CONFIRM_ACTIVATE_TITLE'
          : 'COMPANY_CATALOG.MESSAGES.CONFIRM_DEACTIVATE_TITLE',
        messageKey: activating
          ? 'COMPANY_CATALOG.MESSAGES.CONFIRM_ACTIVATE_MESSAGE'
          : 'COMPANY_CATALOG.MESSAGES.CONFIRM_DEACTIVATE_MESSAGE',
        cancelKey: 'COMPANY_CATALOG.MESSAGES.CANCEL',
        confirmKey: activating
          ? 'COMPANY_CATALOG.MESSAGES.ACTIVATE'
          : 'COMPANY_CATALOG.MESSAGES.DEACTIVATE',
        messageParams: { companyName: company.name }
      },
      '420px'
    );

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed?: boolean) => {
        if (confirmed) {
          this.updateCompanyStatus(company);
        } else {
          this.loadCompanies();
        }
      });
  }

  /**
   * Sends the new status of a company through the update endpoint.
   *
   * @param company Company whose status must be updated.
   */
  private updateCompanyStatus(company: Company): void {
    const request: UpdateCompanyRequest = { isActive: !company.isActive };
    this.updatingIds.update((ids) => addPendingId(ids, company.id));

    this.companiesService.updateCompany(company.id, request).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response: ApiResponse<Company>) => {
        this.notifications.success(
          response.message || this.i18nService.translate('COMPANY_CATALOG.MESSAGES.UPDATE_SUCCESS')
        );
        this.updatingIds.update((ids) => removePendingId(ids, company.id));
        this.loadCompanies();
      },
      error: (error: unknown) => {
        this.notifications.error(
          extractApiErrorMessage(error, this.i18nService.translate('COMPANY_CATALOG.MESSAGES.UPDATE_ERROR'))
        );
        this.updatingIds.update((ids) => removePendingId(ids, company.id));
      }
    });
  }

  /**
   * Loads the non-deleted users and opens the reusable company dialog in
   * create mode. The dialog is not opened when the contacts cannot be loaded,
   * so the contact list is never incomplete.
   */
  openCreateDialog(): void {
    this.usersService.getUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: ApiResponse<User[]>) => this.openCreateCompanyDialog(response.data ?? []),
      error: (error: unknown) => {
        this.notifications.error(
          extractApiErrorMessage(error, this.i18nService.translate('COMPANY_CATALOG.MESSAGES.ERROR_LOADING_USERS'))
        );
      }
    });
  }

  private openCreateCompanyDialog(users: User[]): void {
    const dialogRef = this.dialog.open(CompanyDialogComponent, {
      width: '480px',
      data: { mode: 'create', users } as CompanyDialogData
    });

    dialogRef.componentInstance.formSubmit
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((model: CompanyFormModel) => this.saveCompany(dialogRef, users, model));

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved?: boolean) => {
        if (saved) {
          this.loadCompanies();
        }
      });
  }

  /**
   * Creates the company and, when a new contact phone was written, persists it
   * on the selected user afterwards.
   *
   * @param dialogRef Dialog that emitted the form.
   * @param users Contacts loaded for the dialog.
   * @param model Raw form state emitted by the dialog.
   */
  private saveCompany(
    dialogRef: MatDialogRef<CompanyDialogComponent>,
    users: User[],
    model: CompanyFormModel
  ): void {
    const request: CreateCompaniesRequest = { companies: [toCreateCompanyRequest(model)] };

    this.companiesService.createCompanies(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.updateContactPhone(dialogRef, users, model),
        error: (error: unknown) => {
          dialogRef.componentInstance.isSaving.set(false);
          this.notifications.error(
            extractApiErrorMessage(error, this.i18nService.translate('COMPANY_CATALOG.MESSAGES.ERROR_CREATING'))
          );
        }
      });
  }

  /**
   * Persists a written contact phone after the company was created.
   *
   * The company is already persisted, so a failure on this last step is
   * notified without blocking the catalog refresh.
   *
   * @param dialogRef Dialog that emitted the form.
   * @param users Contacts loaded for the dialog.
   * @param model Raw form state emitted by the dialog.
   */
  private updateContactPhone(
    dialogRef: MatDialogRef<CompanyDialogComponent>,
    users: User[],
    model: CompanyFormModel
  ): void {
    const phoneUpdate = resolveContactPhoneUpdate(model, users);

    if (!phoneUpdate) {
      this.finishCompanySave(dialogRef);
      return;
    }

    this.usersService.updateUser(phoneUpdate.id, { phoneNumber: phoneUpdate.phoneNumber })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.finishCompanySave(dialogRef),
        error: (error: unknown) => {
          this.notifications.error(
            extractApiErrorMessage(error, this.i18nService.translate('COMPANY_CATALOG.MESSAGES.ERROR_UPDATING_CONTACT'))
          );
          dialogRef.close(true);
        }
      });
  }

  private finishCompanySave(dialogRef: MatDialogRef<CompanyDialogComponent>): void {
    this.notifications.success(this.i18nService.translate('COMPANY_CATALOG.MESSAGES.CREATED'));
    dialogRef.close(true);
  }

  /**
   * Placeholder for the edit-company flow.
   *
   * The dialog already supports edit mode, but the edit action is disabled
   * until that flow is enabled.
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
}
