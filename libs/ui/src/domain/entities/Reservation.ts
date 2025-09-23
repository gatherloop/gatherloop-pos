import { Variant } from './Variant';

export type Reservation = {
  id: number;
  code: string;
  name: string;
  variant: Variant;
  createdAt: string;
  checkinAt: string;
  checkoutAt: string | null;
};

export type ReservationCheckinForm = {
  name: string;
  reservations: {
    code: string;
    variant: Variant;
  }[];
};

export type ReservationCheckoutForm = {
  reservations: Reservation[];
};

export type CheckoutStatus = 'completed' | 'ongoing' | 'all';
