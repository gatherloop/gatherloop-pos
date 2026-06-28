import { Category } from './Category';

export type ProductSaleType = 'purchase' | 'rental';

export type ProductStatus = 'draft' | 'published';

export type Product = {
  id: number;
  name: string;
  description?: string;
  category: Category;
  imageUrl: string;
  createdAt: string;
  options: Option[];
  saleType: ProductSaleType;
  status: ProductStatus;
};

export type Option = {
  id: number;
  name: string;
  values: OptionValue[];
};

export type OptionValue = {
  id: number;
  name: string;
};

export type ProductForm = {
  name: string;
  description?: string;
  categoryId: number;
  imageUrl: string;
  options: {
    id?: number;
    name: string;
    values: {
      id?: number;
      name: string;
    }[];
  }[];
  saleType: 'purchase' | 'rental';
};
