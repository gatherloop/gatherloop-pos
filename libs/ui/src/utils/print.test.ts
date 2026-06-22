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
  items: items.map(({ productName, station }) => ({
    variant: buildVariant(productName, station),
    price: 10000,
    amount: 1,
    discountAmount: 0,
    note: '',
  })),
});

const orderSlipItems = (payload: ReturnType<typeof buildOrderSlipPayload>) => {
  if (!payload || payload.type !== 'ORDER_SLIP') {
    throw new Error('expected an ORDER_SLIP payload');
  }
  return payload.orderSlip.items;
};

describe('buildOrderSlipPayload', () => {
  it('groups items into a single slip by station', () => {
    const transaction = buildSource([
      { productName: 'Fried Rice', station: 'KITCHEN' },
      { productName: 'Beer', station: 'BAR' },
      { productName: 'Board Game Ticket', station: 'NONE' },
    ]);

    const payload = buildOrderSlipPayload(transaction);

    expect(payload?.type).toBe('ORDER_SLIP');
    const items = orderSlipItems(payload);
    expect(items.kitchens).toHaveLength(1);
    expect(items.kitchens[0].name).toBe('Fried Rice - Large');
    expect(items.bars).toHaveLength(1);
    expect(items.bars[0].name).toBe('Beer - Large');
  });

  it('excludes NONE-station items from both groups', () => {
    const transaction = buildSource([
      { productName: 'Fried Rice', station: 'KITCHEN' },
      { productName: 'Board Game Ticket', station: 'NONE' },
    ]);

    const items = orderSlipItems(buildOrderSlipPayload(transaction));
    expect(items.kitchens).toHaveLength(1);
    expect(items.bars).toHaveLength(0);
  });

  it('returns null when no item belongs to the bar or kitchen', () => {
    const transaction = buildSource([
      { productName: 'Board Game Ticket', station: 'NONE' },
    ]);

    expect(buildOrderSlipPayload(transaction)).toBeNull();
  });

  it('keeps only name, amount and note on each order slip item', () => {
    const transaction = buildSource([
      { productName: 'Beer', station: 'BAR' },
    ]);

    const items = orderSlipItems(buildOrderSlipPayload(transaction));
    expect(items.bars[0]).toEqual({
      name: 'Beer - Large',
      amount: 1,
      note: '',
    });
  });
});
