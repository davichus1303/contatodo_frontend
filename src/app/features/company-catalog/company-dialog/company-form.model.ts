/**
 * View model emitted by the company dialog when the user saves.
 *
 * It carries the raw form state so the application mapper
 * (`toCreateCompanyRequest` / `toUpdateCompanyRequest`) can shape the transport
 * payload without the component owning DTO assembly.
 */
export interface CompanyFormModel {
  readonly name: string;
  readonly webSite: string;
  readonly ubication: string;
  readonly contactUserOId: string;
  readonly phoneNumber: string;
}
