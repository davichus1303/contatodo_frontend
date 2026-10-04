import { TestBed } from '@angular/core/testing';
import { CompanySelectionService } from './company-selection.service';
import { STORAGE_PORT } from '../ports/storage.port';
import { StoragePort } from '../ports/storage.port';
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';

/**
 * Coverage for the persisted company selection.
 *
 * The backend rejects any company scoped read or write that cannot resolve a
 * company, so a root session that loses its choice on reload would find the
 * catalog and the sales history empty. These tests pin the persistence that
 * keeps the choice available, and the clearing that stops it from outliving an
 * explicit reset.
 */
describe('CompanySelectionService', () => {
  const key = GENERAL_CONSTANTS.STORAGE.SELECTED_COMPANY_OID;
  let storage: jasmine.SpyObj<StoragePort>;

  beforeEach(() => {
    storage = jasmine.createSpyObj<StoragePort>('StoragePort', ['getItem', 'setItem', 'removeItem']);

    TestBed.configureTestingModule({
      providers: [{ provide: STORAGE_PORT, useValue: storage }]
    });
  });

  function createService(): CompanySelectionService {
    return TestBed.inject(CompanySelectionService);
  }

  it('should start without a company when nothing was stored', () => {
    storage.getItem.and.returnValue(null);

    expect(createService().companyOid()).toBeNull();
  });

  it('should restore the company chosen in a previous visit', () => {
    storage.getItem.and.returnValue('company-1');

    expect(createService().companyOid()).toBe('company-1');
  });

  it('should read the stored company from the shared key', () => {
    storage.getItem.and.returnValue(null);

    createService();

    expect(storage.getItem).toHaveBeenCalledOnceWith(key);
  });

  it('should publish and persist the selected company', () => {
    storage.getItem.and.returnValue(null);
    const service = createService();

    service.select('company-2');

    expect(service.companyOid()).toBe('company-2');
    expect(storage.setItem).toHaveBeenCalledOnceWith(key, 'company-2');
  });

  it('should publish and clear the selection when the company is reset', () => {
    storage.getItem.and.returnValue('company-1');
    const service = createService();

    service.select(null);

    expect(service.companyOid()).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledOnceWith(key);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});