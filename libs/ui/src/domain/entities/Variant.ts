import { Material } from './Material';
import { Product } from './Product';

export type Variant = {
  id: number;
  name: string;
  price: number;
  description?: string;
  materials: {
    id: number;
    materialId: number;
    amount: number;
    material: Material;
  }[];
  product: Product;
  createdAt: string;
  values: VariantValue[];
};

export type VariantValue = {
  id: number;
  variantId: number;
  optionValueId: number;
  optionValue: {
    id: number;
    name: string;
  };
};

export type VariantForm = {
  name: string;
  price: number;
  description?: string;
  materials: {
    id?: number;
    materialId: number;
    amount: number;
    material: Material;
  }[];
  productId: number;
  values: {
    id?: number;
    optionValueId: number;
  }[];
};
