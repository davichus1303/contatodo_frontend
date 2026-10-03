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
    byUserOid: 'user-1'
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

  it('should map a user whose role comes from the users endpoint payload', () => {
    const backendUser = {
      id: 'u1',
      userName: 'ADrian',
      email: 'adrian.marcelo@am.com',
      name: 'Adrian marcelo',
      phoneNumber: '',
      role: {
        id: 'r1',
        name: 'Admin',
        permissions: [
          {
            moduleOid: 'm1',
            moduleName: 'Usuarios',
            permissions: { create: true, update: true, delete: true, view: true }
          }
        ],
        isDeleted: false,
        isActive: true,
        createdDate: '2026-09-11T19:06:17.158',
        updatedDate: '2026-09-22T18:27:07.059',
        byUserOid: null,
        updatedByUserOid: null
      },
      company: { id: 'c1', name: 'VichoBox' },
      companyOid: 'c1',
      byUserOid: null,
      updatedByUserOid: null,
      createdDate: '2026-09-16T17:00:48.353',
      updatedDate: '2026-09-22T18:37:03.999',
      active: true
    };

    const result = mapUsers([backendUser]);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value[0].name).toBe('Adrian marcelo');
      expect(result.value[0].companyOid).toBe('c1');
      expect(result.value[0].role?.name).toBe('Admin');
      expect(result.value[0].role?.permissions[0].moduleOid).toBe('m1');
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
