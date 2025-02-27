import { Category } from './Category';
import { Material } from './Material';

export type Product = {
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
  category: Category;
  createdAt: string;
};

export type ProductForm = {
  name: string;
  price: number;
  description?: string;
  materials: {
    id?: number;
    materialId: number;
    amount: number;
    material: Material;
  }[];
  categoryId: number;
};
