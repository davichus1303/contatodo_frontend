/**
 * Extracts a human-readable message from an HTTP error response.
 *
 * Replicates the legacy extraction used across components: the backend error
 * body (`error.error`) is inspected for a truthy string `message`; anything
 * else falls back to the provided default message.
 *
 * Note: legacy call sites used `error.error?.message ?? fallback` (truthy
 * check), so empty or non-string messages always resolved to the fallback.
 * This function preserves that observable behavior.
 *
 * @param error Error thrown by HttpClient (typically `HttpErrorResponse`).
 * @param fallbackMessage Default message when the body carries no usable text.
 * @returns The extracted message or the fallback.
 */
export function extractApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const candidate = error as { error?: unknown } | null | undefined;
  const body: unknown = candidate?.error;

  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return fallbackMessage;
}
