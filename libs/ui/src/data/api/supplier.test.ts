import { supplierTransformers } from './supplier';

describe('supplierTransformers', () => {
  describe('supplier', () => {
    it('maps all fields correctly', () => {
      const result = supplierTransformers.supplier({
        id: 1,
        name: 'Best Supplier',
        address: 'Jl. Raya No. 1, Jakarta',
        mapsLink: 'https://maps.google.com/?q=1,2',
        phone: '081234567890',
        createdAt: '2024-03-20T00:00:00.000Z',
      });
      expect(result).toEqual({
        id: 1,
        name: 'Best Supplier',
        address: 'Jl. Raya No. 1, Jakarta',
        mapsLink: 'https://maps.google.com/?q=1,2',
        phone: '081234567890',
        createdAt: '2024-03-20T00:00:00.000Z',
      });
    });

    it('defaults phone to empty string when undefined', () => {
      const result = supplierTransformers.supplier({
        id: 2,
        name: 'Local Supplier',
        address: 'Jl. Lokal No. 5',
        mapsLink: 'https://maps.google.com/?q=3,4',
        createdAt: '2024-03-21T00:00:00.000Z',
      });
      expect(result.phone).toBe('');
    });
  });
});
