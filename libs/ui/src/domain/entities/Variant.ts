import { z } from 'zod';
import { Material } from './Material';
import { Product } from './Product';
import { VariantTag } from './Tag';

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
  imageUrl?: string;
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
  isAvailable: boolean;
  availableQuantity?: number;
  isSellable: boolean;
  sellableQuantity?: number;
  tags: VariantTag[];
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
  imageUrl?: string;
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
  tagIds: number[];
};

export const variantFormSchema = z.object({
  productId: z.number(),
  name: z.string().min(1),
  description: z.string(),
  recipe: z.string(),
  imageUrl: z.string().optional(),
  materials: z.array(
    z.lazy(() => z.object({ materialId: z.number(), amount: z.number() }))
  ),
  values: z.array(z.lazy(() => z.object({ optionValueId: z.number() }))),
  pricingTiers: z.array(
    z.lazy(() => z.object({ upToMinutes: z.number(), price: z.number() }))
  ),
  tagIds: z.array(z.number()),
});
