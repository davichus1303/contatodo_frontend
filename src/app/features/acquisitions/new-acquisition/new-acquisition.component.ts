import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AcquisitionsService } from '@core/application/acquisitions/acquisitions.service';
import { ProductsService } from '@core/application/products/products.service';
import { AcquisitionTypeService } from '@core/application/acquisition-types/acquisition-type.service';
import { toCreateAcquisitionRequest } from '@core/application/acquisitions/create-acquisition.mapper';
import { Product } from '@core/domain/models/product.model';
import { AcquisitionType } from '@core/domain/models/acquisition-type.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { ACQUISITIONS_CONSTANTS } from '@shared/constants/acquisitions.constants';
import { I18nService } from '@core/i18n/i18n.service';
import { openConfirmationDialog } from '@shared/utils/dialog.utils';
import { AcquisitionFormComponent } from './acquisition-form.component';
import { AcquisitionFormModel } from './acquisition-form.model';

/**
 * Smart container for the "New Acquisition" page.
 *
 * Loads reference data, orchestrates the save flow (confirmation dialog,
 * request mapping, snackbar feedback) and owns navigation. Form internals
 * live in {@link AcquisitionFormComponent}.
 */
@Component({
  selector: 'app-new-acquisition',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    AcquisitionFormComponent
  ],
  templateUrl: './new-acquisition.component.html',
  styleUrls: ['./new-acquisition.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewAcquisitionComponent {
  private readonly acquisitionsService = inject(AcquisitionsService);
  private readonly productsService = inject(ProductsService);
  private readonly acquisitionTypeService = inject(AcquisitionTypeService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18nService = inject(I18nService);

  private readonly form = viewChild.required(AcquisitionFormComponent);

  /** Reference data for the form. */
  readonly acquisitionTypes = signal<AcquisitionType[]>([]);
  readonly products = signal<Product[]>([]);
  /** True while an acquisition is being submitted. */
  readonly isSaving = signal<boolean>(false);

  constructor() {
    this.loadAcquisitionTypes();
    this.loadProducts();
  }

  /**
   * Loads acquisition types from the API.
   */
  private loadAcquisitionTypes(): void {
    this.acquisitionTypeService.getAcquisitionTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<AcquisitionType[]>) => {
          this.acquisitionTypes.set(response.data ?? []);
        },
        error: () => {
          this.notifications.error(ACQUISITIONS_CONSTANTS.MESSAGES.ERROR_LOADING_ACQUISITIONS);
        }
      });
  }

  /**
   * Loads all products used to detect brand-new products in the form.
   */
  private loadProducts(): void {
    this.productsService.getAllProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: ApiResponse<Product[]>) => {
          this.products.set((response.data ?? []).filter(p => p.stock >= 0));
        },
        error: () => {
          this.notifications.error(ACQUISITIONS_CONSTANTS.MESSAGES.ERROR_LOADING_PRODUCTS);
        }
      });
  }

  /**
   * Opens the confirmation dialog and submits when confirmed.
   *
   * @param model Raw form state emitted by the acquisition form.
   */
  onFormSave(model: AcquisitionFormModel): void {
    const dialogRef = openConfirmationDialog(
      this.dialog,
      {
        titleKey: 'ACQUISITIONS.CONFIRMATION.TITLE',
        messageKey: 'ACQUISITIONS.CONFIRMATION.MESSAGE',
        cancelKey: 'ACQUISITIONS.FORM.CANCEL',
        confirmKey: 'ACQUISITIONS.FORM.SAVE'
      },
      ACQUISITIONS_CONSTANTS.DIALOG.WIDTH
    );

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed: boolean | undefined) => {
        if (confirmed) {
          this.submitAcquisition(model);
        }
      });
  }

  /**
   * Submits the acquisition to the backend.
   *
   * @param model Raw form state emitted by the acquisition form.
   */
  private submitAcquisition(model: AcquisitionFormModel): void {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    const request = toCreateAcquisitionRequest(model);

    this.acquisitionsService.createAcquisition(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.dialog.closeAll();
          this.notifications.success(ACQUISITIONS_CONSTANTS.MESSAGES.ACQUISITION_REGISTERED_SUCCESSFULLY);
          this.form().resetForm();
          this.loadProducts();
        },
        error: (error: { error?: { message?: string } }) => {
          this.isSaving.set(false);
          this.notifications.error(extractApiErrorMessage(error, ACQUISITIONS_CONSTANTS.MESSAGES.ERROR_REGISTERING_ACQUISITION));
        }
      });
  }

  /**
   * Navigates back to the acquisitions list.
   */
  goBack(): void {
    this.router.navigate(['/acquisitions']);
  }
}
