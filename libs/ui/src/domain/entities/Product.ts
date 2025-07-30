import { Category } from './Category';

export type Product = {
  id: number;
  name: string;
  description?: string;
  category: Category;
  createdAt: string;
  options: {
    id: number;
    name: string;
    values: {
      id: number;
      name: string;
    }[];
  }[];
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
