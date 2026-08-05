/**
 * Acquisition type model.
 */
export interface AcquisitionType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  affectsInventory?: boolean;
  createdDate?: string;
  updatedDate?: string;
}
