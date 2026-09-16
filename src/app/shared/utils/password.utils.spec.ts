import { generateRandomPassword } from './password.utils';

describe('generateRandomPassword', () => {
  it('should generate a password of at least 8 characters', () => {
    expect(generateRandomPassword(8).length).toBe(8);
    expect(generateRandomPassword().length).toBe(12);
    expect(generateRandomPassword(4).length).toBe(8);
  });

  it('should always include an uppercase letter, a digit and a symbol', () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const password = generateRandomPassword();
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[!@#$%^&*()\-_=+]/);
    }
  });
});