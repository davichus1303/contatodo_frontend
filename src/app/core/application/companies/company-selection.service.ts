import { Injectable, signal } from '@angular/core';

/**
 * In-memory company selection shared by the sales and products pages.
 *
 * The owning company picked on any of the sales or products pages is inherited
 * by the others for the duration of the session, so navigating between them
 * keeps the same company scoping. A `null` value means no company has been
 * chosen yet: a root session must pick one before any scoped query can run.
 */
@Injectable({
  providedIn: 'root'
})
export class CompanySelectionService {
  private readonly selectedCompanyOid = signal<string | null>(null);

  /** Company selected on the sales module, or `null` when none was picked. */
  readonly companyOid = this.selectedCompanyOid.asReadonly();

  /**
   * Stores the selected company.
   *
   * @param companyOid Selected company identifier, or `null` to clear it.
   */
  select(companyOid: string | null): void {
    this.selectedCompanyOid.set(companyOid);
  }
}
