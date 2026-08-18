import { Cart, CartItem, Product, Variant } from '../../domain/entities';
import { CartRepository } from '../../domain/repositories/cart';

// Mirrors the fixture in `data/mock/menu.ts` so a story or test wiring both
// mocks together sees the same products/variants in the cart as in the menu.
const product: Product = {
  id: 1,
  name: 'Es Kopi Susu',
  description: 'Kopi susu gula aren dengan es',
  category: {
    id: 1,
    name: 'Minuman',
    station: 'BAR',
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  imageUrl: '',
  saleType: 'purchase',
  status: 'published',
  options: [
    {
      id: 1,
      name: 'Ukuran',
      values: [
        { id: 1, name: 'Regular' },
        { id: 2, name: 'Large' },
      ],
    },
  ],
  createdAt: '2024-03-20T00:00:00.000Z',
};

const variants: Record<number, Variant> = {
  1: {
    id: 1,
    name: 'Es Kopi Susu - Regular',
    price: 18000,
    materials: [],
    product,
    createdAt: '2024-03-20T00:00:00.000Z',
    values: [
      {
        id: 1,
        variantId: 1,
        optionValueId: 1,
        optionValue: { id: 1, name: 'Regular' },
      },
    ],
    pricingTiers: [],
  },
  2: {
    id: 2,
    name: 'Es Kopi Susu - Large',
    price: 22000,
    materials: [],
    product,
    createdAt: '2024-03-20T00:00:00.000Z',
    values: [
      {
        id: 2,
        variantId: 2,
        optionValueId: 2,
        optionValue: { id: 2, name: 'Large' },
      },
    ],
    pricingTiers: [],
  },
};

function recompute(cart: Cart): Cart {
  return {
    ...cart,
    itemCount: cart.items.reduce((sum, item) => sum + item.amount, 0),
    total: cart.items.reduce((sum, item) => sum + item.subtotal, 0),
  };
}

const initialCart = (): Cart => ({
  id: 1,
  sessionId: 'mock-session-id',
  tableId: null,
  table: null,
  status: 'active',
  items: [],
  itemCount: 0,
  total: 0,
  createdAt: '2024-03-20T00:00:00.000Z',
});

export class MockCartRepository implements CartRepository {
  cart: Cart = initialCart();
  private nextItemId = 1;

  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  fetchCurrentCart: CartRepository['fetchCurrentCart'] = async () => {
    if (this.shouldFail) throw new Error('Failed to fetch cart');
    return { ...this.cart };
  };

  // Mirrors D9: adding an item whose variantId and trimmed note match an
  // existing line increments that line instead of creating a second one.
  addItem: CartRepository['addItem'] = async ({
    variantId,
    amount,
    note,
  }) => {
    if (this.shouldFail) throw new Error('Failed to add item');
    const variant = variants[variantId];
    if (!variant) throw new Error('Variant not found');

    const trimmedNote = note.trim();
    const existing = this.cart.items.find(
      (item) => item.variantId === variantId && item.note === trimmedNote
    );

    const items = existing
      ? this.cart.items.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                amount: item.amount + amount,
                subtotal: item.price * (item.amount + amount),
              }
            : item
        )
      : [
          ...this.cart.items,
          {
            id: this.nextItemId++,
            cartId: this.cart.id,
            variantId,
            variant,
            amount,
            note: trimmedNote,
            price: variant.price,
            subtotal: variant.price * amount,
            createdAt: new Date().toISOString(),
          } satisfies CartItem,
        ];

    this.cart = recompute({ ...this.cart, items });
    return { ...this.cart };
  };

  updateItem: CartRepository['updateItem'] = async ({
    cartItemId,
    amount,
    note,
  }) => {
    if (this.shouldFail) throw new Error('Failed to update item');
    const items = this.cart.items.map((item) =>
      item.id === cartItemId
        ? { ...item, amount, note, subtotal: item.price * amount }
        : item
    );
    this.cart = recompute({ ...this.cart, items });
    return { ...this.cart };
  };

  removeItem: CartRepository['removeItem'] = async (cartItemId) => {
    if (this.shouldFail) throw new Error('Failed to remove item');
    const items = this.cart.items.filter((item) => item.id !== cartItemId);
    this.cart = recompute({ ...this.cart, items });
    return { ...this.cart };
  };

  clearCart: CartRepository['clearCart'] = async () => {
    if (this.shouldFail) throw new Error('Failed to clear cart');
    this.cart = recompute({ ...this.cart, items: [] });
    return { ...this.cart };
  };

  reset() {
    this.cart = initialCart();
    this.nextItemId = 1;
    this.shouldFail = false;
  }
}
