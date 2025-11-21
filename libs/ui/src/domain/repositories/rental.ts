import {
  CheckoutStatus,
  Rental,
  RentalCheckinForm,
  RentalCheckoutForm,
} from '../entities';

export interface RentalRepository {
  getRentalList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    checkoutStatus: CheckoutStatus;
  }) => {
    rentals: Rental[];
    totalItem: number;
  };

  fetchRentalList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    checkoutStatus: CheckoutStatus;
  }) => Promise<{
    rentals: Rental[];
    totalItem: number;
  }>;

  deleteRentalById: (transactionId: number) => Promise<void>;

  checkinRentals: (formValues: RentalCheckinForm) => Promise<void>;

  checkoutRentals: (
    formValues: RentalCheckoutForm
  ) => Promise<{ transactionId: number }>;
}
