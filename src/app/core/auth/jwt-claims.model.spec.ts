import { parseJwtClaims, JwtClaims } from './jwt-claims.model';

const validPermission = (overrides: Record<string, unknown> = {}) => ({
  moduleOid: 'm1',
  permissions: { create: true, update: true, delete: false, view: true },
  ...overrides
});

const validClaims = (overrides: Record<string, unknown> = {}) => ({
  sub: 'user@example.com',
  roleId: 'r1',
  roleName: 'Admin',
  role: 'Admin',
  permissionOfRole: [validPermission()],
  companyOid: 'c1',
  ...overrides
});

describe('parseJwtClaims', () => {
  it('should build claims from a valid payload', () => {
    const result = parseJwtClaims(validClaims());

    expect(result.ok).toBeTrue();
    if (result.ok) {
      const claims: JwtClaims = result.value;
      expect(claims.subject).toBe('user@example.com');
      expect(claims.roleId).toBe('r1');
      expect(claims.roleName).toBe('Admin');
      expect(claims.companyOid).toBe('c1');
      expect(claims.permissions).toHaveSize(1);
      expect(claims.permissions[0].moduleOid).toBe('m1');
      expect(claims.permissions[0].permissions.delete).toBeFalse();
    }
  });

  it('should trim and normalize text fields', () => {
    const result = parseJwtClaims(
      validClaims({ sub: '  user@example.com  ', roleId: '  r1  ', companyOid: undefined })
    );

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.subject).toBe('user@example.com');
      expect(result.value.roleId).toBe('r1');
      expect(result.value.companyOid).toBeUndefined();
    }
  });

  it('should allow a session without a role or permissions', () => {
    const result = parseJwtClaims(validClaims({ roleId: undefined, roleName: undefined, role: undefined, permissionOfRole: undefined, companyOid: undefined }));

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.roleId).toBeUndefined();
      expect(result.value.permissions).toEqual([]);
    }
  });

  it('should reject non-object payloads', () => {
    expect(parseJwtClaims(null).ok).toBeFalse();
    expect(parseJwtClaims('jwt').ok).toBeFalse();
    expect(parseJwtClaims([1, 2]).ok).toBeFalse();
  });

  it('should reject a payload without a subject', () => {
    const result = parseJwtClaims(validClaims({ sub: '' }));

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((error) => error.field)).toContain('sub');
    }
  });

  it('should reject permission entries without a module or boolean flags', () => {
    const result = parseJwtClaims(
      validClaims({
        permissionOfRole: [
          validPermission({ moduleOid: '  ' }),
          validPermission({ permissions: { create: 'yes', update: true, delete: true, view: true } })
        ]
      })
    );

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      const fields = result.error.map((error) => error.field);
      expect(fields).toContain('permissionOfRole[0]');
      expect(fields).toContain('permissionOfRole[1].permissions');
    }
  });

  it('should reject non-array permissionOfRole', () => {
    const result = parseJwtClaims(validClaims({ permissionOfRole: 'all' }));

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((error) => error.field)).toContain('permissionOfRole');
    }
  });
});