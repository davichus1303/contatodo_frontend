import { DomainError, domainError } from '../../domain/errors/domain-error';
import { AcquisitionType, createAcquisitionType } from '../../domain/models/acquisition-type.model';
import { err, ok, Result } from '../../domain/result';

/**
 * Maps a raw acquisition types collection payload to validated domain types.
 *
 * The payload must be an array; every element goes through
 * {@link createAcquisitionType}. Fail-fast for catalogs: if any element
 * violates the domain contract, none of them is delivered and every violation
 * is returned with its collection index for context.
 *
 * @param raw Raw `data` payload, typically the API response body.
 * @returns Successful result with the acquisition types, or every violation found.
 */
export function mapAcquisitionTypes(raw: unknown): Result<AcquisitionType[], readonly DomainError[]> {
  if (!Array.isArray(raw)) {
    return err([domainError('acquisitionTypes', 'Acquisition types payload must be an array.')]);
  }

  const acquisitionTypes: AcquisitionType[] = [];
  const errors: DomainError[] = [];

  raw.forEach((item, index) => {
    const mapped = createAcquisitionType(item);

    if (mapped.ok) {
      acquisitionTypes.push(mapped.value);
      return;
    }

    errors.push(
      ...mapped.error.map((error) =>
        domainError(`acquisitionTypes[${index}].${error.field}`, error.message)
      )
    );
  });

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(acquisitionTypes);
}
