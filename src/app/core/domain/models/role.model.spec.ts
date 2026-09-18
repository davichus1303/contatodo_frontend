import { createRole } from './role.model';

describe('createRole', () => {
  function validRole(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'role-1',
      name: 'Administrador',
      permissions: [
        {
          moduleOid: 'module-1',
          permissions: { create: true, update: true, delete: false, view: true }
        }
      ],
      isDeleted: false,
      isActive: true,
      createdDate: '2026-01-01',
      updatedDate: '2026-01-02',
      createdBy: 'user-1',
      ...overrides
    };
  }

  it('should accept a fully populated payload and preserve every field', () => {
    const result = createRole(validRole());

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.id).toBe('role-1');
      expect(result.value.name).toBe('Administrador');
      expect(result.value.permissions.length).toBe(1);
      expect(result.value.permissions[0].permissions.delete).toBeFalse();
    }
  });

  it('should reject non-object payloads', () => {
    expect(createRole(null).ok).toBeFalse();
    expect(createRole('role').ok).toBeFalse();
  });

  it('should reject missing or blank id and name', () => {
    const missingId = createRole(validRole({ id: '' }));
    const missingName = createRole(validRole({ name: '   ' }));

    expect(missingId.ok).toBeFalse();
    expect(missingName.ok).toBeFalse();
    if (!missingId.ok) {
      expect(missingId.error.map((e) => e.field)).toContain('id');
    }
    if (!missingName.ok) {
      expect(missingName.error.map((e) => e.field)).toContain('name');
    }
  });

  it('should reject non-array permissions', () => {
    const result = createRole(validRole({ permissions: 'all' }));

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((e) => e.field)).toContain('permissions');
    }
  });

  it('should reject permission entries without module or boolean flags', () => {
    const result = createRole(validRole({
      permissions: [
        { moduleOid: '', permissions: { create: true, update: true, delete: true, view: true } },
        { moduleOid: 'module-2', permissions: { create: 'yes', update: true, delete: true, view: true } }
      ]
    }));

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      const fields = result.error.map((e) => e.field);
      expect(fields).toContain('permissions[0]');
      expect(fields).toContain('permissions[1].permissions');
    }
  });

  it('should build a new object with trimmed strings', () => {
    const result = createRole(validRole({
      id: '  role-1  ',
      name: '  Administrador  ',
      createdBy: '  user-1  ',
      permissions: [
        { moduleOid: '  module-1  ', permissions: { create: true, update: true, delete: false, view: true } }
      ]
    }));

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.id).toBe('role-1');
      expect(result.value.name).toBe('Administrador');
      expect(result.value.createdBy).toBe('user-1');
      expect(result.value.permissions[0].moduleOid).toBe('module-1');
    }
  });

  it('should default absent status flags to false', () => {
    const result = createRole({
      id: 'role-1',
      name: 'Administrador',
      permissions: [],
      createdDate: '2026-01-01',
      updatedDate: '2026-01-02',
      createdBy: 'user-1'
    });

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.isActive).toBeFalse();
      expect(result.value.isDeleted).toBeFalse();
    }
  });

  it('should reject non-boolean status flags when present', () => {
    const result = createRole(validRole({ isActive: 'yes' }));

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((e) => e.field)).toContain('isActive');
    }
  });
});
