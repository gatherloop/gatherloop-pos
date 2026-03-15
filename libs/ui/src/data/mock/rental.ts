import {
  CheckoutStatus,
  Rental,
  RentalCheckinForm,
  RentalCheckoutForm,
} from '../../domain/entities';
import { RentalRepository } from '../../domain/repositories/rental';

const mockVariant = {
  id: 1,
  name: 'Variant 1',
  price: 100,
  materials: [],
  product: {
    id: 1,
    name: 'Product 1',
    category: { id: 1, name: 'Cat 1', createdAt: '2024-03-20T00:00:00.000Z' },
    imageUrl: '',
    createdAt: '2024-03-20T00:00:00.000Z',
    options: [],
    saleType: 'rental' as const,
  },
  createdAt: '2024-03-20T00:00:00.000Z',
  values: [],
};

const initialRentals: Rental[] = [
  {
    id: 1,
    code: 'RENTAL001',
    name: 'Rental 1',
    variant: mockVariant,
    createdAt: '2024-03-20T00:00:00.000Z',
    checkinAt: '2024-03-20T08:00:00.000Z',
    checkoutAt: null,
  },
  {
    id: 2,
    code: 'RENTAL002',
    name: 'Rental 2',
    variant: mockVariant,
    createdAt: '2024-03-21T00:00:00.000Z',
    checkinAt: '2024-03-21T08:00:00.000Z',
    checkoutAt: null,
  },
];

export class MockRentalRepository implements RentalRepository {
  rentals: Rental[] = [...initialRentals];

  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  getRentalList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    checkoutStatus: CheckoutStatus;
  }): { rentals: Rental[]; totalItem: number } {
    return { rentals: [...this.rentals], totalItem: this.rentals.length };
  }

  async fetchRentalList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    checkoutStatus: CheckoutStatus;
  }): Promise<{ rentals: Rental[]; totalItem: number }> {
    if (this.shouldFail) throw new Error('Failed to fetch rentals');
    return Promise.resolve({
      rentals: [...this.rentals],
      totalItem: this.rentals.length,
    });
  }

  async deleteRentalById(transactionId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to delete rental');
    this.rentals = this.rentals.filter((r) => r.id !== transactionId);
  }

  async checkinRentals(_formValues: RentalCheckinForm): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to checkin rentals');
  }

  async checkoutRentals(
    _formValues: RentalCheckoutForm
  ): Promise<{ transactionId: number }> {
    if (this.shouldFail) throw new Error('Failed to checkout rentals');
    return { transactionId: 1 };
  }

  reset() {
    this.rentals = [...initialRentals];
    this.shouldFail = false;
  }
}
