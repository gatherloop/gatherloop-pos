import { z } from 'zod';
import { Material } from './Material';
import { Product } from './Product';

export type PricingTier = {
  upToMinutes: number;
  price: number;
};

export type Variant = {
  id: number;
  name: string;
  price: number;
  description?: string;
  recipe?: string;
  materials: {
    id: number;
    materialId: number;
    amount: number;
    material: Material;
  }[];
  product: Product;
  createdAt: string;
  values: VariantValue[];
  pricingTiers: PricingTier[];
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
  recipe?: string;
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
  pricingTiers: PricingTier[];
};

// Partial validator, not a parser: `price`, and the `id`/`material` fields on
// each `materials`/`values` entry are intentionally left undescribed. The
// resolver is called with `{ raw: true }` so those fields pass through
// unvalidated instead of being stripped.
export const variantFormSchema = z.object({
  productId: z.number(),
  name: z.string().min(1),
  description: z.string(),
  recipe: z.string(),
  materials: z.array(
    z.lazy(() => z.object({ materialId: z.number(), amount: z.number() }))
  ),
  values: z.array(z.lazy(() => z.object({ optionValueId: z.number() }))),
  pricingTiers: z.array(
    z.lazy(() => z.object({ upToMinutes: z.number(), price: z.number() }))
  ),
});
