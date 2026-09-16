import { Product, Variant } from '../domain/entities';
import { resolveOptionValueAvailability } from './resolveOptionValueAvailability';

const category = {
  id: 1,
  name: 'Minuman',
  station: 'BAR' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const flavorOption = {
  id: 1,
  name: 'Flavor',
  values: [
    { id: 1, name: 'Vanilla' },
    { id: 2, name: 'Banana' },
    { id: 3, name: 'Hazelnut' },
  ],
};

const esKopiSusu: Product = {
  id: 1,
  name: 'Es Kopi Susu',
  category,
  imageUrl: 'https://example.com/es-kopi-susu.jpg',
  createdAt: '2024-03-20T00:00:00.000Z',
  options: [flavorOption],
  saleType: 'purchase',
  status: 'published',
  isAvailable: true,
  availabilityTracking: 'none',
  isSellable: true,
};

function variant(
  id: number,
  optionValueId: number,
  isSellable: boolean
): Variant {
  return {
    id,
    name: `Variant ${id}`,
    price: 10000,
    materials: [],
    product: esKopiSusu,
    createdAt: '2024-03-20T00:00:00.000Z',
    values: [
      {
        id,
        variantId: id,
        optionValueId,
        optionValue: { id: optionValueId, name: 'value' },
      },
    ],
    pricingTiers: [],
    isAvailable: isSellable,
    isSellable,
  };
}

describe('resolveOptionValueAvailability', () => {
  it('marks Vanilla unavailable while Banana and Hazelnut stay available', () => {
    const variants = [
      variant(1, 1, false),
      variant(2, 2, true),
      variant(3, 3, true),
    ];

    const availability = resolveOptionValueAvailability(
      esKopiSusu,
      variants,
      []
    );

    expect(availability).toEqual({
      1: false,
      2: true,
      3: true,
    });
  });

  it('treats a value as unavailable when it has no matching variant at all', () => {
    const variants = [variant(2, 2, true)];

    const availability = resolveOptionValueAvailability(
      esKopiSusu,
      variants,
      []
    );

    expect(availability[1]).toBe(false);
    expect(availability[2]).toBe(true);
    expect(availability[3]).toBe(false);
  });
});
