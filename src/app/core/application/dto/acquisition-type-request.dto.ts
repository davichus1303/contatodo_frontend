export interface CreateAcquisitionTypeRequest {
  name: string;
  description?: string;
  affectsInventory?: boolean;
}

export interface UpdateAcquisitionTypeRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  affectsInventory?: boolean;
}
