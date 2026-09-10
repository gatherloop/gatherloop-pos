import { z } from 'zod';
import { PricingTier, Variant } from './Variant';

export type Rental = {
  id: number;
  code: string;
  name: string;
  variant: Variant;
  createdAt: string;
  checkinAt: string;
  checkoutAt: string | null;
  pricingTiers: PricingTier[];
  total?: number;
  ticketId: number | null;
  ticketName: string | null;
};

export type RentalCheckinForm = {
  name: string;
  rentals: {
    code: string;
    variant: Variant;
  }[];
  checkinAt: {
    date: number;
    month: number;
    year: number;
    hour: number;
    minute: number;
  } | null;
};

export type RentalCheckoutForm = {
  rentals: Rental[];
};

export const rentalCheckoutFormSchema = z.object({
  rentals: z.array(z.lazy(() => z.any())).min(1),
});

export const rentalCheckinFormSchema = z.object({
  name: z.string().min(1),
  rentals: z
    .array(
      z.lazy(() =>
        z.object({
          code: z.string().min(1),
          variant: z.any(),
        })
      )
    )
    .min(1),
});

export type CheckoutStatus = 'completed' | 'ongoing' | 'all';
