/**
 * Decodes the payload segment of a JWT token into its raw JSON value.
 *
 * The token is expected in the compact serialization
 * {@code header.payload.signature}. Only the payload is read; headers and
 * signatures are ignored because the token was already validated by the
 * backend and, on the client, only drives presentation decisions.
 *
 * @param token JWT token in compact serialization.
 * @returns Decoded payload as raw JSON value.
 * @throws Error when the token has no payload segment or the JSON is malformed.
 */
export function decodeJwtPayload(token: string): unknown {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid JWT token.');
  }

  const base64Url = parts[1] as string;
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  const raw = atob(base64 + '='.repeat(padding));

  const json = decodeURIComponent(
    Array.from(raw)
      .map((char) => '%' + char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );

  return JSON.parse(json);
}