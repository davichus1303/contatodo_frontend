import { ChangeDetectionStrategy, Component, forwardRef, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldAppearance, MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';
import { I18nService } from '@core/i18n/i18n.service';

/** Value emitted by the selector: a single OID, a list of OIDs, or no selection. */
export type UnitOfMeasureSelection = string | readonly string[] | null;

/**
 * Reusable unit of measure selector for reactive forms.
 *
 * <p>The component is presentational: the owner loads the units and passes
 * them through {@link units}. It supports single and multiple selection, an
 * optional required rule and the disabled state of the parent form control.
 * Options are sorted by name and rendered as `name (abbreviation)` so the
 * operator can identify the unit even when its name is long.</p>
 *
 * <p>Use active units for create/edit flows and non-deleted units when the
 * selection belongs to a historical record. The catalog facade exposes both
 * lists.</p>
 */
@Component({
  selector: 'app-unit-of-measure-select',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './unit-of-measure-select.component.html',
  styleUrls: ['./unit-of-measure-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UnitOfMeasureSelectComponent),
      multi: true
    }
  ]
})
export class UnitOfMeasureSelectComponent implements ControlValueAccessor {
  private readonly i18nService = inject(I18nService);

  /** Units offered by the selector. The owner decides whether they are active or historical. */
  @Input() units: readonly UnitOfMeasure[] = [];
  /** Enables multiple selection and emits an array of OIDs. */
  @Input() multiple = false;
  /** Displays the required error when no value is selected. */
  @Input() required = false;
  /** Optional label; falls back to the catalog translation. */
  @Input() label = '';
  /** Optional placeholder; falls back to the catalog translation. */
  @Input() placeholder = '';
  /** Form field appearance. */
  @Input() appearance: MatFormFieldAppearance = 'outline';

  readonly value = signal<UnitOfMeasureSelection>(null);
  readonly disabled = signal(false);
  readonly touched = signal(false);

  private onChange: (value: UnitOfMeasureSelection) => void = () => {};
  private onTouchedCallback: () => void = () => {};

  /**
   * Sorted copy of the available units.
   */
  get sortedUnits(): readonly UnitOfMeasure[] {
    return [...this.units].sort((first, second) => first.name.localeCompare(second.name));
  }

  /**
   * Resolved label shown by the form field.
   */
  get labelText(): string {
    return this.label || this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.SELECTOR.LABEL');
  }

  /**
   * Resolved placeholder shown by the control.
   */
  get placeholderText(): string {
    return this.placeholder || this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.SELECTOR.PLACEHOLDER');
  }

  /**
   * Message shown when the owner has no units to offer.
   */
  get emptyMessageText(): string {
    return this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.SELECTOR.EMPTY');
  }

  /**
   * Message shown when the required rule is violated.
   */
  get requiredMessageText(): string {
    return this.i18nService.translate('UNIT_OF_MEASURE_CATALOG.SELECTOR.REQUIRED');
  }

  /**
   * Whether the control currently has a usable selection.
   */
  get hasValue(): boolean {
    const current = this.value();

    if (Array.isArray(current)) {
      return current.length > 0;
    }

    return current !== null && current.length > 0;
  }

  /**
   * Whether the required error must be displayed.
   */
  get showRequiredError(): boolean {
    return this.required && this.touched() && !this.disabled() && !this.hasValue;
  }

  /**
   * Whether the owner provided no units at all.
   */
  get showEmptyHint(): boolean {
    return this.units.length === 0;
  }

  /** @inheritdoc */
  writeValue(value: unknown): void {
    this.value.set(this.normalizeValue(value));
  }

  /** @inheritdoc */
  registerOnChange(fn: (value: UnitOfMeasureSelection) => void): void {
    this.onChange = fn;
  }

  /** @inheritdoc */
  registerOnTouched(fn: () => void): void {
    this.onTouchedCallback = fn;
  }

  /** @inheritdoc */
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  /**
   * Handles a selection change and propagates it to the parent form.
   *
   * @param event Mat select change event.
   */
  onSelectionChange(event: MatSelectChange): void {
    const normalized = this.normalizeValue(event.value);
    this.value.set(normalized);
    this.onChange(normalized);
    this.markAsTouched();
  }

  /**
   * Marks the control as touched when the panel closes without a selection.
   *
   * @param isOpen Whether the select panel is open.
   */
  onOpenedChange(isOpen: boolean): void {
    if (!isOpen) {
      this.markAsTouched();
    }
  }

  /**
   * Marks the control as touched.
   */
  markAsTouched(): void {
    if (this.touched() || this.disabled()) {
      return;
    }

    this.touched.set(true);
    this.onTouchedCallback();
  }

  /**
   * Normalizes any incoming value to the shape expected by the current mode.
   *
   * @param value Raw value from the form or the select.
   * @returns Single OID, list of OIDs, or null when empty.
   */
  private normalizeValue(value: unknown): UnitOfMeasureSelection {
    if (this.multiple) {
      if (!Array.isArray(value)) {
        return [];
      }

      return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
    }

    return typeof value === 'string' && value.length > 0 ? value : null;
  }
}
