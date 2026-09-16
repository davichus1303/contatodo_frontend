const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+';
const ALL_CHARACTERS = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS;
const MINIMUM_LENGTH = 8;

function randomIndex(size: number): number {
  return Math.floor(Math.random() * size);
}

function shuffle(characters: string[]): string[] {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1);
    const current = characters[index];
    characters[index] = characters[target];
    characters[target] = current;
  }
  return characters;
}

/**
 * Generates a random password that satisfies the backend password rule
 * (at least one uppercase letter, one symbol and a minimum length of 8).
 *
 * @param length Desired password length, at least 8.
 * @returns Random password string.
 */
export function generateRandomPassword(length = 12): string {
  const totalLength = Math.max(MINIMUM_LENGTH, length);

  const characters = [
    UPPERCASE[randomIndex(UPPERCASE.length)],
    LOWERCASE[randomIndex(LOWERCASE.length)],
    DIGITS[randomIndex(DIGITS.length)],
    SYMBOLS[randomIndex(SYMBOLS.length)]
  ];

  while (characters.length < totalLength) {
    characters.push(ALL_CHARACTERS[randomIndex(ALL_CHARACTERS.length)]);
  }

  return shuffle(characters).join('');
}