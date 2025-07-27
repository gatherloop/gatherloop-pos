import { Category } from './Category';

export type Product = {
  id: number;
  name: string;
  description?: string;
  category: Category;
  createdAt: string;
};

export type ProductForm = {
  name: string;
  description?: string;
  categoryId: number;
};
