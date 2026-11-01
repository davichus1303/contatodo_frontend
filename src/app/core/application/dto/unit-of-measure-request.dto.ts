export interface CreateUnitOfMeasureRequest {
  name: string;
  abrev: string;
  companyOid?: string;
}

export interface UpdateUnitOfMeasureRequest {
  name?: string;
  abrev?: string;
  isActive?: boolean;
  isDeleted?: boolean;
}
