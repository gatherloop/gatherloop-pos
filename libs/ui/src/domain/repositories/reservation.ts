import {
  CheckoutStatus,
  Reservation,
  ReservationCheckinForm,
  ReservationCheckoutForm,
} from '../entities';

export interface ReservationRepository {
  getReservationList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    checkoutStatus: CheckoutStatus;
  }) => {
    reservations: Reservation[];
    totalItem: number;
  };

  fetchReservationList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    checkoutStatus: CheckoutStatus;
  }) => Promise<{
    reservations: Reservation[];
    totalItem: number;
  }>;

  deleteReservationById: (transactionId: number) => Promise<void>;

  checkinReservations: (formValues: ReservationCheckinForm) => Promise<void>;

  checkoutReservations: (
    formValues: ReservationCheckoutForm
  ) => Promise<{ transactionId: number }>;
}
