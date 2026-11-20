export interface CreateUnitOfMeasureRequest {
  name: string;
  abrev: string;
  companyOid?: string;
  isDivisible?: boolean;
  isPack?: boolean;
}

export interface UpdateUnitOfMeasureRequest {
  name?: string;
  abrev?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isDivisible?: boolean;
  isPack?: boolean;
}
