import { Injectable, inject, signal } from '@angular/core';
import { STORAGE_PORT } from '../ports/storage.port';
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';

/**
 * Company selection shared by the sales and products pages.
 *
 * The owning company picked on any of the sales or products pages is inherited
 * by the others for the duration of the session, so navigating between them
 * keeps the same company scoping. A `null` value means no company has been
 * chosen yet: a root session must pick one before any scoped query can run.
 *
 * The choice is persisted because the backend rejects any company scoped read
 * or write that cannot resolve one. Losing it on every reload would force a
 * root session to pick the company again, leaving the catalog and the sales
 * history empty until it did. The session company claim still wins on the
 * backend, so this only matters for a session without a company.
 */
@Injectable({
  providedIn: 'root'
})
export class CompanySelectionService {
  private readonly storage = inject(STORAGE_PORT);
  private readonly selectedCompanyOid = signal<string | null>(this.restore());

  /** Company selected on the sales module, or `null` when none was picked. */
  readonly companyOid = this.selectedCompanyOid.asReadonly();

  /**
   * Stores the selected company, keeping it across reloads.
   *
   * @param companyOid Selected company identifier, or `null` to clear it.
   */
  select(companyOid: string | null): void {
    this.selectedCompanyOid.set(companyOid);

    if (companyOid === null) {
      this.storage.removeItem(GENERAL_CONSTANTS.STORAGE.SELECTED_COMPANY_OID);
      return;
    }

    this.storage.setItem(GENERAL_CONSTANTS.STORAGE.SELECTED_COMPANY_OID, companyOid);
  }

  /**
   * Reads back the company chosen in a previous visit.
   *
   * @returns Stored company identifier, or `null` when none was stored.
   */
  private restore(): string | null {
    return this.storage.getItem(GENERAL_CONSTANTS.STORAGE.SELECTED_COMPANY_OID);
  }
}
