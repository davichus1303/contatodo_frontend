import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Product } from '../../../shared/models/product.model';
import { ProductFormPayload } from '../../../shared/dto/product-request.dto';
import { I18nService } from '../../../shared/utils/i18n.util';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit, OnChanges {
  @Input() product: Product | null = null;
  @Input() isEdit = false;
  @Output() formSubmit = new EventEmitter<ProductFormPayload>();

  readonly form = signal<FormGroup | null>(null);
  readonly isEditMode = signal<boolean>(false);

  private readonly dialogRef = inject(MatDialogRef<ProductFormComponent>);
  private readonly dialogData = inject(MAT_DIALOG_DATA, { optional: true }) as { product?: Product | null; isEdit?: boolean } | null;

  constructor(
    private readonly formBuilder: FormBuilder,
    readonly i18nService: I18nService
  ) {}

  ngOnInit(): void {
    this.syncInputsFromDialogData();
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] || changes['isEdit']) {
      this.buildForm();
    }
  }

  private syncInputsFromDialogData(): void {
    if (!this.dialogData) {
      return;
    }

    this.product = this.dialogData.product ?? this.product;
    this.isEdit = this.dialogData.isEdit ?? this.isEdit;
  }

  private buildForm(): void {
    this.isEditMode.set(this.isEdit);
    this.form.set(this.formBuilder.group({
      name: [this.product?.name ?? '', [Validators.required, Validators.maxLength(100)]],
      description: [this.product?.description ?? '', [Validators.required, Validators.maxLength(500)]],
      stock: [this.product?.stock ?? 0, [Validators.required, Validators.min(0)]],
      realCost: [this.product?.realCost ?? 0, [Validators.required, Validators.min(0)]],
      unitRealCost: [this.product?.unitRealCost ?? 0, [Validators.required, Validators.min(0)]],
      unitPublicCost: [this.product?.unitPublicCost ?? 0, [Validators.required, Validators.min(0)]],
    }));
  }

  submit(): void {
    const form = this.form();
    if (!form || form.invalid) {
      form?.markAllAsTouched();
      return;
    }

    const payload: ProductFormPayload = {
      name: form.value.name,
      description: form.value.description,
      stock: Number(form.value.stock),
      realCost: Number(form.value.realCost),
      unitRealCost: Number(form.value.unitRealCost),
      unitPublicCost: Number(form.value.unitPublicCost)
    };

    this.formSubmit.emit(payload);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  get formGroup(): FormGroup | null {
    return this.form();
  }

  get title(): string {
    return this.isEdit
      ? this.i18nService.translate('PRODUCTS.MODAL.EDIT_TITLE')
      : this.i18nService.translate('PRODUCTS.MODAL.CREATE_TITLE');
  }

  get submitLabel(): string {
    return this.isEdit
      ? this.i18nService.translate('PRODUCTS.FORM.SAVE_CHANGES')
      : this.i18nService.translate('PRODUCTS.FORM.CREATE');
  }

  get isSubmitDisabled(): boolean {
    const form = this.form();
    if (!form) {
      return true;
    }

    return form.invalid || (this.isEdit && !form.dirty);
  }
}
