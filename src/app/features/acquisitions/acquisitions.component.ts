import { Component, inject, signal, computed, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NotificationService } from '@core/application/notifications/notification.service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AcquisitionsService } from '@core/application/acquisitions/acquisitions.service';
import { Acquisition } from '@core/domain/models/acquisition.model';
import { CompaniesService } from '@core/application/companies/companies.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { Company } from '@core/domain/models/company.model';
import { PermissionService } from '@core/application/permissions/permission.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';
import { ACQUISITIONS_CONSTANTS } from '@shared/constants/acquisitions.constants';
import { formatCurrency as formatCurrencyUtil } from '@shared/utils/format.utils';
import { I18nService } from '@core/i18n/i18n.service';
import { PermissionDirective } from '@shared/directives/permission.directive';

@Component({
  selector: 'app-acquisitions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    PermissionDirective
  ],
  templateUrl: './acquisitions.component.html',
  styleUrls: ['./acquisitions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcquisitionsComponent implements OnDestroy {
  private readonly acquisitionsService = inject(AcquisitionsService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  readonly i18nService = inject(I18nService);
  private readonly companiesService = inject(CompaniesService);
  private readonly companySelection = inject(CompanySelectionService);
  private readonly permissionService = inject(PermissionService);
  private readonly destroy$ = new Subject<void>();

  readonly startDateControl = new FormControl<Date>(this.getDefaultStartDate());
  readonly endDateControl = new FormControl<Date>(this.getDefaultEndDate());
  readonly acquisitions = signal<Acquisition[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly companies = signal<Company[]>([]);
  readonly companyOid = signal<string | null>(null);

  /** True when the session can pick the company that scopes the acquisitions. */
  readonly canSelectCompany = this.permissionService.isRoot();

  readonly totalInvestment = computed(() => {
    return this.acquisitions()
      .filter((acquisition: Acquisition) => !acquisition.productName || acquisition.productName === 'Unknown')
      .reduce((sum: number, acquisition: Acquisition) => sum + acquisition.realCost, 0);
  });

  readonly totalExpenses = computed(() => {
    return this.acquisitions()
      .filter((acquisition: Acquisition) => acquisition.productName && acquisition.productName !== 'Unknown')
      .reduce((sum: number, acquisition: Acquisition) => sum + acquisition.realCost, 0);
  });

  constructor() {
    this.startDateControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadAcquisitions());
    this.endDateControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadAcquisitions());
    this.init();
  }

  /**
   * Restores the company chosen in another module and loads acquisitions.
   *
   * <p>A root session must pick a company first, so the date filters stay
   * disabled and no unscoped read is issued until then.</p>
   */
  private init(): void {
    this.companyOid.set(this.companySelection.companyOid());

    if (this.canSelectCompany) {
      this.loadCompanies();
      this.disableDateRange();
      if (this.companyOid()) {
        this.enableDateRange();
        this.loadAcquisitions();
      }
    } else {
      this.loadAcquisitions();
    }
  }

  /**
   * Loads the active, non-deleted companies available to a root session.
   */
  private loadCompanies(): void {
    this.companiesService.getActiveCompanies().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: ApiResponse<Company[]>) => {
        this.companies.set(response.data ?? []);
      },
      error: (error: unknown) => {
        this.notifications.error(
          extractApiErrorMessage(error, this.i18nService.translate('ACQUISITIONS.MESSAGES.ERROR_LOADING_COMPANIES'))
        );
      }
    });
  }

  /**
   * Handles a company selection and reloads the acquisitions of that company.
   *
   * @param companyOid Selected company identifier, or an empty value to clear.
   */
  onCompanySelected(companyOid: string | null): void {
    this.companyOid.set(companyOid);
    this.companySelection.select(companyOid);

    if (companyOid) {
      this.enableDateRange();
      this.loadAcquisitions();
    } else {
      this.disableDateRange();
      this.acquisitions.set([]);
    }
  }

  /**
   * True while a root session has not chosen a company, which blocks both the
   * date filters and the creation of acquisitions.
   */
  isCompanyRequired(): boolean {
    return this.canSelectCompany && !this.companyOid();
  }

  /**
   * Unlocks the date filters once a company scopes the read.
   *
   * <p>Toggling the state must not emit, otherwise every control would fire a
   * read of its own and duplicate the request the caller already triggers.</p>
   */
  private enableDateRange(): void {
    this.startDateControl.enable({ emitEvent: false });
    this.endDateControl.enable({ emitEvent: false });
  }

  /**
   * Locks the date filters while the company that scopes the read is unknown.
   */
  private disableDateRange(): void {
    this.startDateControl.disable({ emitEvent: false });
    this.endDateControl.disable({ emitEvent: false });
  }

  /**
   * Gets the default start date with time set to 07:00:00.
   *
   * @returns Default start date.
   */
  private getDefaultStartDate(): Date {
    const now = new Date();
    now.setHours(
      ACQUISITIONS_CONSTANTS.DATE.DEFAULT_START_HOUR,
      ACQUISITIONS_CONSTANTS.DATE.DEFAULT_START_MINUTE,
      ACQUISITIONS_CONSTANTS.DATE.DEFAULT_START_SECOND,
      0
    );
    return now;
  }

  /**
   * Gets the default end date with time set to 23:59:59.999.
   *
   * @returns Default end date.
   */
  private getDefaultEndDate(): Date {
    const now = new Date();
    now.setHours(
      ACQUISITIONS_CONSTANTS.DATE.DEFAULT_END_HOUR,
      ACQUISITIONS_CONSTANTS.DATE.DEFAULT_END_MINUTE,
      ACQUISITIONS_CONSTANTS.DATE.DEFAULT_END_SECOND,
      ACQUISITIONS_CONSTANTS.DATE.DEFAULT_END_MILLISECOND
    );
    return now;
  }

  /**
   * Loads acquisitions from the backend based on selected date range.
   */
  loadAcquisitions(): void {
    if (this.isLoading() || this.isCompanyRequired()) {
      return;
    }

    this.isLoading.set(true);
    const startDate = this.startDateControl.value;
    const endDate = this.endDateControl.value;

    this.acquisitionsService
      .getAcquisitions(startDate ?? undefined, endDate ?? undefined, this.companyOid() ?? undefined)
      .pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: ApiResponse<Acquisition[]>) => {
        this.acquisitions.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.notifications.error(ACQUISITIONS_CONSTANTS.MESSAGES.ERROR_LOADING_ACQUISITIONS);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Navigates to the new acquisition page.
   */
  goToNewAcquisition(): void {
    this.router.navigate(['/acquisitions/new']);
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
   * Formats a date string for display.
   *
   * @param dateString Date string to format.
   * @returns Formatted date string.
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(GENERAL_CONSTANTS.CURRENCY.LOCALE, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Cleanup on component destroy.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
