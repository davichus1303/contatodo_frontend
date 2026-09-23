import { decodeJwtPayload } from './jwt-utils';

/**
 * Builds a compact JWT token with the given payload and a fake signature.
 *
 * @param payload JSON payload claims.
 * @returns Token string in {@code header.payload.signature} form.
 */
function buildToken(payload: unknown): string {
  const encode = (value: unknown): string =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  return `${encode({ alg: 'HS256' })}.${encode(payload)}.fake-signature`;
}

describe('decodeJwtPayload', () => {
  it('should decode a valid token payload', () => {
    const payload = { sub: 'user@example.com', role: 'ROOT', permissionOfRole: [] };

    expect(decodeJwtPayload(buildToken(payload))).toEqual(payload);
  });

  it('should preserve UTF-8 characters in the payload', () => {
    const payload = { roleName: 'Café Administración' };

    expect(decodeJwtPayload(buildToken(payload))).toEqual(payload);
  });

  it('should throw when the token has no payload segment', () => {
    expect(() => decodeJwtPayload('header-only')).toThrow();
  });

  it('should throw when the payload is not valid JSON', () => {
    const encoded = btoa('not-json');

    expect(() => decodeJwtPayload(`header.${encoded}.signature`)).toThrow();
  });
});