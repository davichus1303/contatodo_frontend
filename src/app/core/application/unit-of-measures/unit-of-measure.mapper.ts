import { createUnitOfMeasure, UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';
import { DomainError } from '@core/domain/errors/domain-error';
import { Result } from '@core/domain/result';

export function mapUnitOfMeasures(raw: unknown): Result<UnitOfMeasure[], readonly DomainError[]> {
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error: [
        {
          field: 'unitOfMeasures',
          message: 'Unit of measures payload must be an array.'
        }
      ] as readonly DomainError[]
    };
  }

  const errors: DomainError[] = [];
  const units: UnitOfMeasure[] = [];

  for (const item of raw) {
    const result = createUnitOfMeasure(item);
    if (!result.ok) {
      errors.push(...result.error);
      continue;
    }
    units.push(result.value);
  }

  if (errors.length > 0) {
    return { ok: false, error: errors };
  }

  return { ok: true, value: units };
}
