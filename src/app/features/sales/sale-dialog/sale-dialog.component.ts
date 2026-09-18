import { ChangeDetectionStrategy, Component, DestroyRef, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SalesService } from '@core/application/sales/sales.service';
import { Product } from '@core/domain/models/product.model';
import { CreateSaleRequest } from '@core/application/dto/create-sale-request.dto';
import { SALES_CONSTANTS } from '@shared/constants/sales.constants';
import { formatCurrency as formatCurrencyUtil } from '@shared/utils/format.utils';
import { calculateProfit as calculateProfitUtil } from '../sales.utils';
import { I18nService } from '@core/i18n/i18n.service';

/**
 * Dialog component for creating a sale.
 */
@Component({
  selector: 'app-sale-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './sale-dialog.component.html',
  styleUrls: ['./sale-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SaleDialogComponent {
  saleForm: FormGroup;
  readonly isLoading = signal<boolean>(false);
  readonly totalCost = signal<number>(0);
  readonly profit = signal<number>(0);
  readonly i18nService = inject(I18nService);

  constructor(
    private dialogRef: MatDialogRef<SaleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product },
    private fb: FormBuilder,
    private salesService: SalesService,
    private notifications: NotificationService,
    private destroyRef: DestroyRef
  ) {
    this.saleForm = this.fb.group({
      quantity: [1, [Validators.required, Validators.min(1)]],
      totalSalePrice: ['', [Validators.required, Validators.min(0)]],
      notes: ['']
    });

    this.saleForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.calculateProfit();
      });
  }

  /**
   * Calculates total cost and profit based on form values.
   */
  calculateProfit(): void {
    const quantity = this.saleForm.get('quantity')?.value || 0;
    const totalSalePrice = this.saleForm.get('totalSalePrice')?.value || 0;

    this.totalCost.set(this.data.product.unitRealCost * quantity);
    this.profit.set(calculateProfitUtil(totalSalePrice, this.totalCost()));
  }

  /**
   * Closes the dialog without saving.
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Saves the sale.
   */
  onSave(): void {
    if (this.saleForm.invalid) {
      this.saleForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const request: CreateSaleRequest = {
      productOid: this.data.product.id,
      quantity: this.saleForm.get('quantity')?.value,
      totalSalePrice: this.saleForm.get('totalSalePrice')?.value,
      notes: this.saleForm.get('notes')?.value
    };

    this.salesService.createSale(request).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.notifications.success(SALES_CONSTANTS.MESSAGES.SALE_CREATED_SUCCESSFULLY);
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.notifications.error(extractApiErrorMessage(error, SALES_CONSTANTS.MESSAGES.ERROR_CREATING_SALE));
      }
    });
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
   * Returns the profit color class.
   *
   * @returns CSS class name.
   */
  getProfitColorClass(): string {
    return this.profit() > 0 ? 'profit-positive' : 'profit-negative';
  }
}
