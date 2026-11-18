import { createDeal, Deal } from '@core/domain/models/deal.model';
import { DomainError } from '@core/domain/errors/domain-error';
import { Result } from '@core/domain/result';

/**
 * Maps a raw transport payload to a list of validated deals.
 *
 * @param raw Raw transport payload.
 * @returns Successful result with the deals, or every violation found.
 */
export function mapDeals(raw: unknown): Result<Deal[], readonly DomainError[]> {
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error: [
        {
          field: 'deals',
          message: 'Deals payload must be an array.'
        }
      ] as readonly DomainError[]
    };
  }

  const errors: DomainError[] = [];
  const deals: Deal[] = [];

  for (const item of raw) {
    const result = createDeal(item);
    if (!result.ok) {
      errors.push(...result.error);
      continue;
    }
    deals.push(result.value);
  }

  if (errors.length > 0) {
    return { ok: false, error: errors };
  }

  return { ok: true, value: deals };
}
