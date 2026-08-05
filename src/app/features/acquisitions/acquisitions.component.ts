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
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AcquisitionsService } from './acquisitions.service';
import { Acquisition } from '../../shared/models/acquisition.model';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { GENERAL_CONSTANTS } from '../../shared/constants/general.constants';
import { ACQUISITIONS_CONSTANTS } from '../../shared/constants/acquisitions.constants';
import { I18nService } from '../../shared/utils/i18n.util';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './acquisitions.component.html',
  styleUrls: ['./acquisitions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcquisitionsComponent implements OnDestroy {
  private readonly acquisitionsService = inject(AcquisitionsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  readonly i18nService = inject(I18nService);
  private readonly destroy$ = new Subject<void>();

  readonly startDateControl = new FormControl<Date>(this.getDefaultStartDate());
  readonly endDateControl = new FormControl<Date>(this.getDefaultEndDate());
  readonly acquisitions = signal<Acquisition[]>([]);
  readonly isLoading = signal<boolean>(false);

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
    this.loadAcquisitions();
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
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    const startDate = this.startDateControl.value;
    const endDate = this.endDateControl.value;

    this.acquisitionsService.getAcquisitions(startDate ?? undefined, endDate ?? undefined).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: ApiResponse<Acquisition[]>) => {
        this.acquisitions.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open(
          ACQUISITIONS_CONSTANTS.MESSAGES.ERROR_LOADING_ACQUISITIONS,
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
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
    return new Intl.NumberFormat(
      GENERAL_CONSTANTS.CURRENCY.LOCALE,
      {
        style: 'currency',
        currency: GENERAL_CONSTANTS.CURRENCY.CURRENCY_CODE
      }
    ).format(value);
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
