import { z } from 'zod';
import { Category } from './Category';

export type ProductSaleType = 'purchase' | 'rental';

export type ProductStatus = 'draft' | 'published';

export type Product = {
  id: number;
  name: string;
  description?: string;
  recipe?: string;
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
  recipe?: string;
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
  status: ProductStatus;
};

// Partial validator, not a full parser: `options` only checks that at least
// one entry exists, each entry's shape (`name`, `values`) is intentionally
// unvalidated (`z.object({})`), so `{ raw: true }` is required at the call
// site to pass the raw items through unparsed.
export const productCreateFormSchema = z.object({
  categoryId: z.number(),
  name: z.string().min(1),
  saleType: z.string().min(1),
  status: z.string().min(1),
  description: z.string(),
  recipe: z.string(),
  imageUrl: z.string().min(1).url(),
  options: z.array(z.object({})).min(1),
});

// Partial validator, not a full parser: `options` is not described at all
// here, so `{ raw: true }` is required at the call site to pass it through
// unparsed.
export const productUpdateFormSchema = z.object({
  categoryId: z.number(),
  name: z.string().min(1),
  saleType: z.string().min(1),
  status: z.string().min(1),
  imageUrl: z.string().min(1).url(),
  description: z.string(),
  recipe: z.string(),
});
