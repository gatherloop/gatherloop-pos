import { Product, Variant } from '../domain/entities';
import { matchMenuSearch } from './matchMenuSearch';

const minuman = {
  id: 1,
  name: 'Minuman',
  station: 'BAR' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const makanan = {
  id: 2,
  name: 'Makanan',
  station: 'KITCHEN' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const rasaOption = {
  id: 1,
  name: 'Rasa',
  values: [
    { id: 1, name: 'Earl Grey' },
    { id: 2, name: 'Jasmine' },
  ],
};

const ukuranOption = {
  id: 2,
  name: 'Ukuran',
  values: [
    { id: 3, name: 'Reguler' },
    { id: 4, name: 'Besar' },
  ],
};

const teh: Product = {
  id: 1,
  name: 'Teh',
  description: 'Teh khas nusantara',
  category: minuman,
  imageUrl: '',
  createdAt: '2024-03-20T00:00:00.000Z',
  options: [rasaOption, ukuranOption],
  saleType: 'purchase',
  status: 'published',
  isAvailable: true,
  availabilityTracking: 'none',
  isSellable: true,
};

const nasiGoreng: Product = {
  id: 2,
  name: 'Nasi Goreng',
  description: 'Pedas dan gurih dengan telur ceplok',
  category: makanan,
  imageUrl: '',
  createdAt: '2024-03-20T00:00:00.000Z',
  options: [],
  saleType: 'purchase',
  status: 'published',
  isAvailable: true,
  availabilityTracking: 'none',
  isSellable: true,
};

function tehVariant(
  id: number,
  name: string,
  optionValueIds: number[]
): Variant {
  return {
    id,
    name,
    price: 10000,
    materials: [],
    product: teh,
    createdAt: '2024-03-20T00:00:00.000Z',
    values: optionValueIds.map((optionValueId) => ({
      id: optionValueId,
      variantId: id,
      optionValueId,
      optionValue: { id: optionValueId, name: 'value' },
    })),
    pricingTiers: [],
    isAvailable: true,
    isSellable: true,
  };
}

const earlGreyReguler = tehVariant(1, 'Teh - Earl Grey - Reguler', [1, 3]);
const earlGreyBesar = tehVariant(2, 'Teh - Earl Grey - Besar', [1, 4]);
const jasmineReguler = tehVariant(3, 'Teh - Jasmine - Reguler', [2, 3]);
const jasmineBesar = tehVariant(4, 'Teh - Jasmine - Besar', [2, 4]);

const nasiGorengVariant: Variant = {
  id: 5,
  name: 'Nasi Goreng',
  price: 25000,
  materials: [],
  product: nasiGoreng,
  createdAt: '2024-03-20T00:00:00.000Z',
  values: [],
  pricingTiers: [],
  isAvailable: true,
  isSellable: true,
};

const variants = [
  earlGreyReguler,
  earlGreyBesar,
  jasmineReguler,
  jasmineBesar,
  nasiGorengVariant,
];

describe('matchMenuSearch', () => {
  // Fixture table kept identical to apps/api/data/mysql/product_search_test.go (D12):
  // a divergence between the Go and TypeScript matcher shows up as a failing test here.
  it.each([
    ['earl grey', 1],
    ['EARL GREY', 1],
    ['teh besar', 1],
    ['rl gre', 1],
  ])('matches "%s" against Teh', (query) => {
    const result = matchMenuSearch(query, teh, variants);

    expect(result.matched).toBe(true);
  });

  it('reports the matched option value for "earl grey"', () => {
    const result = matchMenuSearch('earl grey', teh, variants);

    expect(result.matched).toBe(true);
    expect(result.matchedProductName).toBe(false);
    expect(result.matchedOptionValues).toEqual([{ id: 1, name: 'Earl Grey' }]);
  });

  it('finds "Earl Grey" via the substring "rl gre" (FR-3)', () => {
    const result = matchMenuSearch('rl gre', teh, variants);

    expect(result.matched).toBe(true);
    expect(result.matchedOptionValues).toEqual([{ id: 1, name: 'Earl Grey' }]);
    expect(result.matchedVariants.map((v) => v.id)).toEqual([1, 2]);
  });

  it('matches every word against a different field (FR-2)', () => {
    const result = matchMenuSearch('teh besar', teh, variants);

    expect(result.matched).toBe(true);
    expect(result.matchedProductName).toBe(true);
    expect(result.matchedOptionValues).toEqual([{ id: 4, name: 'Besar' }]);
  });

  it('does not match a product missing one of the words', () => {
    const result = matchMenuSearch('teh kiwi', teh, variants);

    expect(result.matched).toBe(false);
  });

  it('matches on category name but reports no matched labels (R1)', () => {
    const result = matchMenuSearch('minuman', teh, variants);

    expect(result.matched).toBe(true);
    expect(result.matchedProductName).toBe(false);
    expect(result.matchedOptionValues).toEqual([]);
    expect(result.matchedVariants).toEqual([]);
  });

  it('never matches on the product description (D3)', () => {
    const result = matchMenuSearch('gurih', nasiGoreng, variants);

    expect(result.matched).toBe(false);
  });

  it('scopes variant matches to the product being checked', () => {
    const result = matchMenuSearch('besar', nasiGoreng, variants);

    expect(result.matched).toBe(false);
  });

  it('matches everything for an empty query', () => {
    const result = matchMenuSearch('', teh, variants);

    expect(result.matched).toBe(true);
    expect(result.matchedOptionValues).toEqual([]);
  });
});
