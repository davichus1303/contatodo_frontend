import { extractApiErrorMessage } from './api-error';

describe('extractApiErrorMessage', () => {
  it('should return the backend message when the body carries a truthy string', () => {
    const error = { error: { message: 'Stock insuficiente' } };

    expect(extractApiErrorMessage(error, 'fallback')).toBe('Stock insuficiente');
  });

  it('should return the fallback when the body is absent', () => {
    expect(extractApiErrorMessage({}, 'fallback')).toBe('fallback');
    expect(extractApiErrorMessage(null, 'fallback')).toBe('fallback');
    expect(extractApiErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('should return the fallback when the body has no message field', () => {
    expect(extractApiErrorMessage({ error: {} }, 'fallback')).toBe('fallback');
  });

  it('should return the fallback for empty-string messages (legacy truthy check)', () => {
    expect(extractApiErrorMessage({ error: { message: '' } }, 'fallback')).toBe('fallback');
  });

  it('should return the fallback for non-string messages (legacy truthy check)', () => {
    expect(extractApiErrorMessage({ error: { message: null } }, 'fallback')).toBe('fallback');
    expect(extractApiErrorMessage({ error: { message: 42 } }, 'fallback')).toBe('fallback');
  });

  it('should handle string bodies by returning the fallback', () => {
    expect(extractApiErrorMessage({ error: 'Internal Server Error' }, 'fallback')).toBe('fallback');
  });
});
