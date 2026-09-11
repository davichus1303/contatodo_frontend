import { err, ok, Result } from './result';

describe('Result', () => {
  it('should carry a successful value', () => {
    const result: Result<number, string> = ok(42);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it('should carry a failure error', () => {
    const result: Result<number, string> = err('boom');

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error).toBe('boom');
    }
  });

  it('should discriminate between branches at type level', () => {
    const results: Array<Result<number, string>> = [ok(1), err('e')];

    const values = results
      .filter((current): current is Extract<typeof current, { ok: true }> => current.ok)
      .map((successful) => successful.value);

    expect(values).toEqual([1]);
  });
});
