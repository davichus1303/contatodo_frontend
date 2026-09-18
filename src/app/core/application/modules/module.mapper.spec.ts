import { mapModules } from './module.mapper';

describe('mapModules', () => {
  it('should map a valid collection to domain modules', () => {
    const result = mapModules([
      { id: 'm1', name: 'Ventas', link: '/sales' },
      { id: 'm2', name: 'Roles', link: '/roles', category: 'Catálogos' }
    ]);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.length).toBe(2);
      expect(result.value[0].category).toBeUndefined();
      expect(result.value[1].category).toBe('Catálogos');
    }
  });

  it('should fail with the offending index when an element is invalid', () => {
    const result = mapModules([{ id: 'm1', name: 'Ventas', link: '/sales' }, { id: 'm2', name: 'Roles' }]);

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((error) => error.field)).toContain('modules[1].link');
    }
  });

  it('should reject a payload that is not an array', () => {
    expect(mapModules(null).ok).toBeFalse();
    expect(mapModules({ id: 'm1' }).ok).toBeFalse();
  });
});
