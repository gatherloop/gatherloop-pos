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

// Only enforces "at least one rental"; each item's own shape is `z.any()`,
// so `{ raw: true }` is required at the call site to keep the full `Rental`
// objects (variant, pricingTiers, etc.) intact instead of stripping them
// down to whatever this schema happens to describe.
export const rentalCheckoutFormSchema = z.object({
  rentals: z.array(z.lazy(() => z.any())).min(1),
});

export type CheckoutStatus = 'completed' | 'ongoing' | 'all';
