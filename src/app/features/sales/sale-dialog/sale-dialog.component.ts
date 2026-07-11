import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesService } from '../sales.service';
import { Product } from '../../../shared/models/product.model';
import { CreateSaleRequest } from '../../../shared/dto/create-sale-request.dto';
import { SALES_CONSTANTS } from '../../../shared/constants/sales.constants';
import { GENERAL_CONSTANTS } from '../../../shared/constants/general.constants';

/**
 * Dialog component for creating a sale.
 */
@Component({
  selector: 'app-sale-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './sale-dialog.component.html',
  styleUrls: ['./sale-dialog.component.scss']
})
export class SaleDialogComponent {
  saleForm: FormGroup;
  isLoading = false;
  totalCost = 0;
  profit = 0;

  constructor(
    private dialogRef: MatDialogRef<SaleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product },
    private fb: FormBuilder,
    private salesService: SalesService,
    private snackBar: MatSnackBar
  ) {
    this.saleForm = this.fb.group({
      quantity: [1, [Validators.required, Validators.min(1)]],
      totalSalePrice: ['', [Validators.required, Validators.min(0)]],
      notes: ['']
    });

    this.saleForm.valueChanges.subscribe(() => {
      this.calculateProfit();
    });
  }

  /**
   * Calculates total cost and profit based on form values.
   */
  calculateProfit(): void {
    const quantity = this.saleForm.get('quantity')?.value || 0;
    const totalSalePrice = this.saleForm.get('totalSalePrice')?.value || 0;

    this.totalCost = this.data.product.unitRealCost * quantity;
    this.profit = totalSalePrice - this.totalCost;
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

    this.isLoading = true;

    const request: CreateSaleRequest = {
      productOid: this.data.product.id,
      quantity: this.saleForm.get('quantity')?.value,
      totalSalePrice: this.saleForm.get('totalSalePrice')?.value,
      notes: this.saleForm.get('notes')?.value
    };

    this.salesService.createSale(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.snackBar.open(
          SALES_CONSTANTS.MESSAGES.SALE_CREATED_SUCCESSFULLY,
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
        this.dialogRef.close(true);
      },
      error: (error: any) => {
        this.isLoading = false;
        this.snackBar.open(
          error.error?.message || SALES_CONSTANTS.MESSAGES.ERROR_CREATING_SALE,
          GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
          { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
        );
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
    return new Intl.NumberFormat(
      GENERAL_CONSTANTS.CURRENCY.LOCALE,
      {
        style: 'currency',
        currency: GENERAL_CONSTANTS.CURRENCY.CURRENCY_CODE
      }
    ).format(value);
  }

  /**
   * Returns the profit color class.
   *
   * @returns CSS class name.
   */
  getProfitColorClass(): string {
    return this.profit > 0 ? 'profit-positive' : 'profit-negative';
  }
}
