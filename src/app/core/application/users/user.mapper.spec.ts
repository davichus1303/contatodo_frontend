import { mapUsers } from './user.mapper';

describe('mapUsers', () => {
  const validRole = {
    id: 'r1',
    name: 'Admin',
    permissions: [
      { moduleOid: 'm1', permissions: { create: true, update: true, delete: false, view: true } }
    ],
    isDeleted: false,
    isActive: true,
    createdDate: '2026-01-01',
    updatedDate: '2026-01-01',
    createdBy: 'user'
  };

  const validUser = {
    id: 'u1',
    userName: 'ana',
    email: 'ana@example.com',
    name: 'Ana',
    phoneNumber: '987654321',
    role: validRole,
    createdDate: '2026-01-01',
    updatedDate: '2026-01-01',
    active: true
  };

  it('should map a valid collection to domain users', () => {
    const result = mapUsers([validUser, { ...validUser, id: 'u2', phoneNumber: null, role: null }]);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.length).toBe(2);
      expect(result.value[0].role?.name).toBe('Admin');
      expect(result.value[1].phoneNumber).toBeUndefined();
      expect(result.value[1].role).toBeNull();
    }
  });

  it('should fail with the offending index when an element is invalid', () => {
    const result = mapUsers([validUser, { ...validUser, id: '' }]);

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((error) => error.field)).toContain('users[1].id');
    }
  });

  it('should reject a payload that is not an array', () => {
    expect(mapUsers(null).ok).toBeFalse();
    expect(mapUsers(validUser).ok).toBeFalse();
  });
});
