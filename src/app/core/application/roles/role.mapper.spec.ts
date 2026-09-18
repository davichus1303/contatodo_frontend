import { mapRoles } from './role.mapper';

describe('mapRoles', () => {
  const validRole = {
    id: 'role-1',
    name: 'Administrador',
    permissions: [
      { moduleOid: 'module-1', permissions: { create: true, update: true, delete: false, view: true } }
    ],
    isDeleted: false,
    isActive: true,
    createdDate: '2026-01-01',
    updatedDate: '2026-01-02',
    createdBy: 'user-1'
  };

  it('should map a valid collection to domain roles', () => {
    const result = mapRoles([validRole, { ...validRole, id: 'role-2', name: 'Vendedor' }]);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.length).toBe(2);
      expect(result.value[0].name).toBe('Administrador');
      expect(result.value[1].id).toBe('role-2');
    }
  });

  it('should fail with the offending index when an element is invalid', () => {
    const result = mapRoles([validRole, { ...validRole, id: '' }]);

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((error) => error.field)).toContain('roles[1].id');
    }
  });

  it('should accumulate every violation with its index', () => {
    const result = mapRoles([{ ...validRole, id: '', name: '' }, validRole]);

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      const fields = result.error.map((error) => error.field);
      expect(fields).toContain('roles[0].id');
      expect(fields).toContain('roles[0].name');
    }
  });

  it('should reject a payload that is not an array', () => {
    expect(mapRoles(null).ok).toBeFalse();
    expect(mapRoles(validRole).ok).toBeFalse();
    expect(mapRoles('roles').ok).toBeFalse();
  });
});
