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
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';

export function decodeJwtPayload(token: string): unknown {
  const parts = token.split(GENERAL_CONSTANTS.JWT.SEGMENT_SEPARATOR);
  if (parts.length < GENERAL_CONSTANTS.JWT.MIN_SEGMENTS) {
    throw new Error(GENERAL_CONSTANTS.JWT.ERRORS.INVALID_TOKEN);
  }

  const base64Url = parts[GENERAL_CONSTANTS.JWT.PAYLOAD_SEGMENT] as string;
  const base64 = base64Url
    .replaceAll(GENERAL_CONSTANTS.JWT.BASE64_URL_SAFE.DASH, GENERAL_CONSTANTS.JWT.BASE64_URL_SAFE.PLUS)
    .replaceAll(GENERAL_CONSTANTS.JWT.BASE64_URL_SAFE.UNDERSCORE, GENERAL_CONSTANTS.JWT.BASE64_URL_SAFE.SLASH);
  const padding =
    (GENERAL_CONSTANTS.JWT.PADDING.MODULUS - (base64.length % GENERAL_CONSTANTS.JWT.PADDING.MODULUS)) %
    GENERAL_CONSTANTS.JWT.PADDING.MODULUS;
  const raw = atob(base64 + GENERAL_CONSTANTS.JWT.PADDING.CHAR.repeat(padding));

  const json = decodeURIComponent(
    Array.from(raw)
      .map((char) => GENERAL_CONSTANTS.JWT.UTF8_ENCODING.PREFIX + char.charCodeAt(GENERAL_CONSTANTS.NUMBERS.ZERO)
        .toString(GENERAL_CONSTANTS.JWT.UTF8_ENCODING.HEX_RADIX)
        .padStart(
          GENERAL_CONSTANTS.JWT.UTF8_ENCODING.HEX_PAD_LENGTH,
          GENERAL_CONSTANTS.JWT.UTF8_ENCODING.HEX_FILL
        ))
      .join(GENERAL_CONSTANTS.EMPTY)
  );

  return JSON.parse(json);
}