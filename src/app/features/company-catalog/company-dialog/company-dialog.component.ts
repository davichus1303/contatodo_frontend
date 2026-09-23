import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Company } from '@core/domain/models/company.model';
import { User } from '@core/domain/models/user.model';
import { I18nService } from '@core/i18n/i18n.service';
import { nonBlank } from '@shared/validators/domain.validators';
import { CompanyFormModel } from './company-form.model';

export type CompanyDialogMode = 'create' | 'edit';

export interface CompanyDialogData {
  mode: CompanyDialogMode;
  users: User[];
  company?: Company;
}

type CompanyFormControls = {
  name: FormControl<string>;
  webSite: FormControl<string>;
  ubication: FormControl<string>;
  contactUserOId: FormControl<string>;
  phoneNumber: FormControl<string>;
};

/**
 * Reusable presentational company form dialog.
 *
 * Renders the company data and, when a contact is selected, its phone number.
 * The phone is filled and locked when the contact already has one; it stays
 * editable and empty otherwise. The dialog only emits the raw form view model
 * through {@link CompanyFormModel}; the container owns the transport mapping,
 * the requests and the saving state. The dialog is prepared to be reused by the
 * edit flow.
 */
@Component({
  selector: 'app-company-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './company-dialog.component.html',
  styleUrls: ['./company-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CompanyDialogComponent>);
  private readonly data = inject<CompanyDialogData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly i18nService = inject(I18nService);

  @Output() readonly formSubmit = new EventEmitter<CompanyFormModel>();

  readonly mode: CompanyDialogMode = this.data.mode;
  readonly users: readonly User[] = this.data.users;
  readonly isSaving = signal<boolean>(false);
  readonly isPhoneLocked = signal<boolean>(false);
  readonly form: FormGroup<CompanyFormControls>;

  constructor() {
    const company = this.data.company;

    this.form = this.formBuilder.group({
      name: this.formBuilder.control(company?.name ?? '', {
        validators: [Validators.required, nonBlank()]
      }),
      webSite: this.formBuilder.control(company?.webSite ?? ''),
      ubication: this.formBuilder.control(company?.ubication ?? ''),
      contactUserOId: this.formBuilder.control(company?.contactUserOId ?? ''),
      phoneNumber: this.formBuilder.control(company?.contactPhone ?? '')
    });

    this.isPhoneLocked.set(Boolean(company?.contactPhone));
  }

  /**
   * Applies the phone data of the selected contact.
   *
   * A contact with a registered phone fills the field and locks it; a contact
   * without a phone or no contact at all clears the field. Only a contact
   * without a phone keeps the field editable.
   *
   * @param contactUserOId Selected contact identifier, empty when none.
   */
  onContactChange(contactUserOId: string): void {
    const contact = this.users.find((user) => user.id === contactUserOId);
    const phoneNumber = contact?.phoneNumber ?? '';

    this.form.controls.contactUserOId.setValue(contactUserOId);
    this.form.controls.phoneNumber.setValue(phoneNumber);
    this.isPhoneLocked.set(!contact ? true : phoneNumber.length > 0);
  }

  /**
   * Resolves the display label of a user option.
   *
   * @param user User to label.
   * @returns The user name, falling back to the username and the email.
   */
  getUserLabel(user: User): string {
    return user.name || user.userName || user.email;
  }

  /**
   * Whether the submit button is disabled.
   */
  get isSubmitDisabled(): boolean {
    return this.isSaving() || this.form.invalid;
  }

  /**
   * Closes the dialog discarding every written value.
   */
  cancel(): void {
    this.dialogRef.close();
  }

  /**
   * Validates the form and emits the raw view model for the container to save.
   */
  submit(): void {
    if (this.isSaving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.formSubmit.emit(this.buildFormModel());
  }

  private buildFormModel(): CompanyFormModel {
    const controls = this.form.controls;

    return {
      name: controls.name.value,
      webSite: controls.webSite.value,
      ubication: controls.ubication.value,
      contactUserOId: controls.contactUserOId.value,
      phoneNumber: controls.phoneNumber.value
    };
  }
}
