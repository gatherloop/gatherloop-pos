import { Category } from './Category';

export type Product = {
  id: number;
  name: string;
  description?: string;
  category: Category;
  createdAt: string;
  options: Option[];
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
  options: {
    id?: number;
    name: string;
    values: {
      id?: number;
      name: string;
    }[];
  }[];
};
