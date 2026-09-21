import { Product } from '../domain/entities';
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

const kopi: Product = {
  id: 3,
  name: 'Kopi',
  description: 'Kopi susu gula aren',
  category: minuman,
  imageUrl: '',
  createdAt: '2024-03-20T00:00:00.000Z',
  options: [],
  saleType: 'purchase',
  status: 'published',
  isAvailable: true,
  availabilityTracking: 'none',
  isSellable: true,
};

describe('matchMenuSearch', () => {
  // Fixture table kept identical to apps/api/data/mysql/product_search_test.go (D12):
  // a divergence between the Go and TypeScript matcher shows up as a failing test here.
  it.each([
    ['earl grey', 1],
    ['EARL GREY', 1],
    ['teh besar', 1],
    ['rl gre', 1],
  ])('matches "%s" against Teh', (query) => {
    const result = matchMenuSearch(query, teh);

    expect(result.matched).toBe(true);
  });

  it('reports the matched option value for "earl grey"', () => {
    const result = matchMenuSearch('earl grey', teh);

    expect(result.matched).toBe(true);
    expect(result.matchedProductName).toBe(false);
    expect(result.matchedOptionValues).toEqual([{ id: 1, name: 'Earl Grey' }]);
  });

  it('finds "Earl Grey" via the substring "rl gre" (FR-3)', () => {
    const result = matchMenuSearch('rl gre', teh);

    expect(result.matched).toBe(true);
    expect(result.matchedOptionValues).toEqual([{ id: 1, name: 'Earl Grey' }]);
  });

  it('matches every word against a different field (FR-2)', () => {
    const result = matchMenuSearch('teh besar', teh);

    expect(result.matched).toBe(true);
    expect(result.matchedProductName).toBe(true);
    expect(result.matchedOptionValues).toEqual([{ id: 4, name: 'Besar' }]);
  });

  it('does not match a product missing one of the words', () => {
    const result = matchMenuSearch('teh kiwi', teh);

    expect(result.matched).toBe(false);
  });

  it('matches on category name but reports no matched labels (R1)', () => {
    const result = matchMenuSearch('minuman', teh);

    expect(result.matched).toBe(true);
    expect(result.matchedProductName).toBe(false);
    expect(result.matchedOptionValues).toEqual([]);
  });

  it('never matches on the product description (D3)', () => {
    const result = matchMenuSearch('gurih', nasiGoreng);

    expect(result.matched).toBe(false);
  });

  it('never matches on a word only a variant name carries, such as "Kopi - Large"', () => {
    const result = matchMenuSearch('large', kopi);

    expect(result.matched).toBe(false);
  });

  it('matches everything for an empty query', () => {
    const result = matchMenuSearch('', teh);

    expect(result.matched).toBe(true);
    expect(result.matchedOptionValues).toEqual([]);
  });
});
