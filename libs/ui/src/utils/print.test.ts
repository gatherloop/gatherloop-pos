import { Variant } from '../domain/entities/Variant';
import { Category, CategoryStation } from '../domain/entities/Category';
import { buildOrderSlipPayload, OrderSlipSource } from './print';

const buildCategory = (station: CategoryStation): Category => ({
  id: 1,
  name: 'Category',
  station,
  createdAt: '2024-01-01T00:00:00.000Z',
});

const buildVariant = (
  productName: string,
  station: CategoryStation
): Variant => ({
  id: 1,
  name: 'Variant',
  price: 10000,
  materials: [],
  product: {
    id: 1,
    name: productName,
    category: buildCategory(station),
    imageUrl: '',
    createdAt: '2024-01-01T00:00:00.000Z',
    options: [],
    saleType: 'purchase',
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  values: [
    {
      id: 1,
      variantId: 1,
      optionValueId: 1,
      optionValue: { id: 1, name: 'Large' },
    },
  ],
  pricingTiers: [],
});

const buildSource = (
  items: { productName: string; station: CategoryStation }[]
): OrderSlipSource => ({
  createdAt: '17/06/2026 10:00',
  name: 'Table 1',
  orderNumber: 1,
  coupons: [],
  isCashless: false,
  paidAmount: 0,
  items: items.map(({ productName, station }) => ({
    variant: buildVariant(productName, station),
    price: 10000,
    amount: 1,
    discountAmount: 0,
    note: '',
  })),
});

describe('buildOrderSlipPayload', () => {
  it('splits items into a KITCHEN slip containing only kitchen items', () => {
    const transaction = buildSource([
      { productName: 'Fried Rice', station: 'KITCHEN' },
      { productName: 'Beer', station: 'BAR' },
      { productName: 'Board Game Ticket', station: 'NONE' },
    ]);

    const payload = buildOrderSlipPayload(transaction, 'KITCHEN');

    expect(payload?.type).toBe('ORDER_SLIP');
    expect(payload && 'station' in payload && payload.station).toBe(
      'KITCHEN'
    );
    expect(payload?.transaction.items).toHaveLength(1);
    expect(payload?.transaction.items[0].name).toBe('Fried Rice - Large');
  });

  it('splits items into a BAR slip containing only bar items', () => {
    const transaction = buildSource([
      { productName: 'Fried Rice', station: 'KITCHEN' },
      { productName: 'Beer', station: 'BAR' },
      { productName: 'Board Game Ticket', station: 'NONE' },
    ]);

    const payload = buildOrderSlipPayload(transaction, 'BAR');

    expect(payload?.transaction.items).toHaveLength(1);
    expect(payload?.transaction.items[0].name).toBe('Beer - Large');
  });

  it('excludes NONE-station items from both slips', () => {
    const transaction = buildSource([
      { productName: 'Board Game Ticket', station: 'NONE' },
    ]);

    expect(buildOrderSlipPayload(transaction, 'KITCHEN')).toBeNull();
    expect(buildOrderSlipPayload(transaction, 'BAR')).toBeNull();
  });

  it('returns null when the station has no items', () => {
    const transaction = buildSource([
      { productName: 'Beer', station: 'BAR' },
    ]);

    expect(buildOrderSlipPayload(transaction, 'KITCHEN')).toBeNull();
  });
});
