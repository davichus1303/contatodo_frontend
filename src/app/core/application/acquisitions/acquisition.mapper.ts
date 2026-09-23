import { DomainError, domainError } from '../../domain/errors/domain-error';
import { Acquisition, createAcquisition } from '../../domain/models/acquisition.model';
import { err, ok, Result } from '../../domain/result';

/**
 * Maps a raw acquisitions collection payload to validated domain acquisitions.
 *
 * The payload must be an array; every element goes through
 * {@link createAcquisition}. Fail-fast: if any element violates the domain
 * contract, none of them is delivered and every violation is returned with its
 * collection index for context.
 *
 * @param raw Raw `data` payload, typically the API response body.
 * @returns Successful result with the acquisitions, or every violation found.
 */
export function mapAcquisitions(raw: unknown): Result<Acquisition[], readonly DomainError[]> {
  if (!Array.isArray(raw)) {
    return err([domainError('acquisitions', 'Acquisitions payload must be an array.')]);
  }

  const acquisitions: Acquisition[] = [];
  const errors: DomainError[] = [];

  raw.forEach((item, index) => {
    const mapped = createAcquisition(item);

    if (mapped.ok) {
      acquisitions.push(mapped.value);
      return;
    }

    errors.push(
      ...mapped.error.map((error) => domainError(`acquisitions[${index}].${error.field}`, error.message))
    );
  });

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(acquisitions);
}
