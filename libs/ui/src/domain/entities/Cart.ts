import { Variant } from './Variant';
import { PublicTable } from './PublicTable';

// FR-3/FR-7 in docs/prd-table-ordering.md. Prices, subtotal and total are
// never client-supplied — they are computed server-side at read time from
// the current `variants.price` (D7), so this entity only ever carries what
// the API already resolved.
export type CartItem = {
  id: number;
  cartId: number;
  variantId: number;
  variant: Variant;
  amount: number;
  note: string;
  price: number;
  subtotal: number;
  createdAt: string;
};

export type CartStatus = 'active' | 'converted' | 'abandoned';

export type Cart = {
  id: number;
  sessionId: string;
  tableId: number | null;
  table: PublicTable | null;
  status: CartStatus;
  items: CartItem[];
  itemCount: number;
  total: number;
  createdAt: string;
};
