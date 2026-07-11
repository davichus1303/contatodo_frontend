export interface ProductFormPayload {
  name: string;
  description: string;
  stock: number;
  code?: string;
  realCost: number;
  unitRealCost: number;
  unitPublicCost: number;
  urlPhoto?: string;
  isActive?: boolean;
  userOid?: string;
}

export interface ProductCreatePayload extends ProductFormPayload {}

export interface ProductUpdatePayload extends ProductFormPayload {}
