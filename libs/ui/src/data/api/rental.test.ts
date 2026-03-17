import { rentalTransformers } from './rental';

const apiVariant = {
  id: 1,
  name: 'Bike A',
  price: 50000,
  createdAt: '2024-03-20T00:00:00.000Z',
  productId: 1,
  product: {
    id: 1,
    name: 'Mountain Bike',
    imageUrl: 'https://example.com/bike.jpg',
    saleType: 'rental' as const,
    createdAt: '2024-03-20T00:00:00.000Z',
    categoryId: 1,
    category: { id: 1, name: 'Bikes', createdAt: '2024-03-20T00:00:00.000Z' },
    options: [],
  },
  materials: [],
  values: [],
};

describe('rentalTransformers', () => {
  describe('rental', () => {
    it('maps all fields correctly for completed rental', () => {
      const result = rentalTransformers.rental({
        id: 1,
        code: 'RENT-001',
        name: 'John Doe',
        checkinAt: '2024-03-20T08:00:00.000Z',
        checkoutAt: '2024-03-20T17:00:00.000Z',
        createdAt: '2024-03-20T08:00:00.000Z',
        variantId: 1,
        variant: apiVariant,
      });
      expect(result).toEqual({
        id: 1,
        code: 'RENT-001',
        name: 'John Doe',
        checkinAt: '2024-03-20T08:00:00.000Z',
        checkoutAt: '2024-03-20T17:00:00.000Z',
        createdAt: '2024-03-20T08:00:00.000Z',
        variant: expect.objectContaining({
          id: 1,
          name: 'Bike A',
          price: 50000,
        }),
      });
    });

    it('sets checkoutAt to null when undefined', () => {
      const result = rentalTransformers.rental({
        id: 2,
        code: 'RENT-002',
        name: 'Jane Doe',
        checkinAt: '2024-03-20T08:00:00.000Z',
        checkoutAt: undefined,
        createdAt: '2024-03-20T08:00:00.000Z',
        variantId: 1,
        variant: apiVariant,
      });
      expect(result.checkoutAt).toBeNull();
    });

    it('maps variant correctly using variantTransformers', () => {
      const result = rentalTransformers.rental({
        id: 1,
        code: 'RENT-001',
        name: 'John Doe',
        checkinAt: '2024-03-20T08:00:00.000Z',
        createdAt: '2024-03-20T08:00:00.000Z',
        variantId: 1,
        variant: apiVariant,
      });
      expect(result.variant.id).toBe(1);
      expect(result.variant.name).toBe('Bike A');
      expect(result.variant.product.name).toBe('Mountain Bike');
    });
  });
});
