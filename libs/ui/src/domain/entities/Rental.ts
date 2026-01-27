import { Variant } from './Variant';

export type Rental = {
  id: number;
  code: string;
  name: string;
  variant: Variant;
  createdAt: string;
  checkinAt: string;
  checkoutAt: string | null;
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

export type CheckoutStatus = 'completed' | 'ongoing' | 'all';
