import { z } from 'zod';
import { AvailabilityTracking } from './Product';

export type AvailabilityVariant = {
  variantId: number;
  variantName: string;
  isAvailable: boolean;
  availableQuantity?: number;
  isSellable: boolean;
  sellableQuantity?: number;
};

export type AvailabilityProduct = {
  productId: number;
  productName: string;
  categoryId: number;
  categoryName: string;
  availabilityTracking: AvailabilityTracking;
  isAvailable: boolean;
  availableQuantity?: number;
  isSellable: boolean;
  sellableQuantity?: number;
  variants: AvailabilityVariant[];
};

export type AvailabilityProductUpdate = {
  productId: number;
  isAvailable?: boolean;
  availableQuantity?: number;
};

export type AvailabilityVariantUpdate = {
  variantId: number;
  isAvailable?: boolean;
  availableQuantity?: number;
};

export type AvailabilityForm = {
  products: AvailabilityProductUpdate[];
  variants: AvailabilityVariantUpdate[];
};

const availabilityProductUpdateFormSchema = z.object({
  productId: z.number().int().positive(),
  isAvailable: z.boolean().optional(),
  availableQuantity: z.number().int().min(0).optional(),
}) satisfies z.ZodType<AvailabilityProductUpdate>;

const availabilityVariantUpdateFormSchema = z.object({
  variantId: z.number().int().positive(),
  isAvailable: z.boolean().optional(),
  availableQuantity: z.number().int().min(0).optional(),
}) satisfies z.ZodType<AvailabilityVariantUpdate>;

export const availabilityFormSchema = z.object({
  products: z.array(availabilityProductUpdateFormSchema),
  variants: z.array(availabilityVariantUpdateFormSchema),
}) satisfies z.ZodType<AvailabilityForm>;
