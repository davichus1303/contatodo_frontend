export interface CreateCompanyRequest {
  name: string;
  rfc?: string;
  webSite?: string;
  ubication?: string;
  contactUserOId?: string;
  isActive?: boolean;
}

export interface CreateCompaniesRequest {
  companies: CreateCompanyRequest[];
}

export interface UpdateCompanyRequest {
  name?: string;
  rfc?: string;
  webSite?: string;
  ubication?: string;
  contactUserOId?: string;
  isActive?: boolean;
}
