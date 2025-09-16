import { Product } from './Product';

export type TransactionCategory = {
  id: number;
  name: string;
  createdAt: string;
  checkoutProductId: number | null;
  checkoutProduct: Product | null;
};

export type TransactionCategoryForm = {
  name: string;
  checkoutProductId: number | null;
};
