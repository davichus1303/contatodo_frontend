/**
 * Product model.
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  stock: number;
  code: string;
  realCost: number;
  unitRealCost: number;
  unitPublicCost: number;
  urlPhoto: string;
  isActive: boolean;
  createdDate: string;
  updatedDate: string;
}
